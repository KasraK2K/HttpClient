import type {
  AdminUser,
  FolderDoc,
  HistoryDoc,
  ProjectDoc,
  RequestDoc,
  User,
  WorkspaceTree,
  WorkspaceMeta,
} from "@restify/shared";
import {
  toObjectId,
  adminsCollection,
  serializeDoc,
  serializeDocs,
  usersCollection,
  workspaceDataCollection,
  workspaceMetaCollection,
  withoutPassword,
} from "./collections.js";
import type { Db } from "mongodb";
import { canViewEntity } from "../lib/permissions.js";

function sanitizeWorkspace(workspace: WorkspaceMeta): WorkspaceMeta {
  return {
    ...workspace,
    passwordHash: null,
    isPasswordProtected: false,
  };
}

function normalizeProject<T extends ProjectDoc>(project: T): T {
  return {
    ...project,
    passwordHash: null,
    isPasswordProtected: false,
    isPrivate: Boolean(project.isPrivate),
  };
}

function normalizeFolder<T extends FolderDoc>(folder: T): T {
  return {
    ...folder,
    isPrivate: Boolean(folder.isPrivate),
  };
}

function normalizeRequest<T extends RequestDoc>(request: T): T {
  return {
    ...request,
    isPrivate: Boolean(request.isPrivate),
  };
}

export async function hasAnyAdmins(db: Db): Promise<boolean> {
  const count = await adminsCollection(db).countDocuments({}, { limit: 1 });
  return count > 0;
}

export async function findUserByUsername(db: Db, username: string) {
  const admin = await adminsCollection(db).findOne({ username });
  if (admin) {
    return admin;
  }

  return usersCollection(db).findOne({ username });
}

export async function findSessionUserById(
  db: Db,
  userId: string,
): Promise<AdminUser | User | null> {
  const adminById = await adminsCollection(db)
    .findOne({ _id: toObjectId(userId) })
    .catch(() => null);
  if (adminById) {
    return withoutPassword(serializeDoc(adminById)!) as AdminUser;
  }

  const userById = await usersCollection(db)
    .findOne({ _id: toObjectId(userId) })
    .catch(() => null);
  if (!userById) {
    return null;
  }

  return withoutPassword(serializeDoc(userById)!) as User;
}

export async function listAccessibleWorkspaces(
  db: Db,
  user: AdminUser | User,
): Promise<WorkspaceMeta[]> {
  if (user.role === "superadmin") {
    return (serializeDocs(
      await workspaceMetaCollection(db)
        .find({})
        .sort({ order: 1, createdAt: 1 })
        .toArray(),
    ) as WorkspaceMeta[]).map(sanitizeWorkspace);
  }

  const workspaces = await workspaceMetaCollection(db)
    .find({
      $or: [{ ownerId: user._id }, { "members.userId": user._id }],
    })
    .sort({ order: 1, createdAt: 1 })
    .toArray();

  return (serializeDocs(workspaces) as WorkspaceMeta[]).map(sanitizeWorkspace);
}

export async function getWorkspaceById(
  db: Db,
  workspaceId: string,
): Promise<WorkspaceMeta | null> {
  const workspace = await workspaceMetaCollection(db)
    .findOne({ _id: toObjectId(workspaceId) })
    .catch(() => null);

  if (!workspace) {
    return null;
  }

  return sanitizeWorkspace(serializeDoc(workspace) as WorkspaceMeta);
}

export async function buildWorkspaceTree(
  db: Db,
  workspace: WorkspaceMeta,
  user: AdminUser | User,
): Promise<WorkspaceTree> {
  const records = serializeDocs(
    await workspaceDataCollection(db, workspace._id)
      .find({})
      .sort({ order: 1, createdAt: 1 })
      .toArray(),
  ) as Array<ProjectDoc | FolderDoc | RequestDoc | HistoryDoc>;

  const projects = records
    .filter((record): record is ProjectDoc => record.entityType === "project")
    .map(normalizeProject);
  const folders = records
    .filter((record): record is FolderDoc => record.entityType === "folder")
    .map(normalizeFolder);
  const requests = records
    .filter((record): record is RequestDoc => record.entityType === "request")
    .map(normalizeRequest);

  const visibleProjects = projects.filter((project) => canViewEntity(user, project));
  const visibleProjectIds = new Set(visibleProjects.map((project) => project._id));
  const visibleFolders = folders.filter(
    (folder) =>
      visibleProjectIds.has(folder.projectId) && canViewEntity(user, folder),
  );
  const visibleFolderIds = new Set(visibleFolders.map((folder) => folder._id));
  const visibleRequests = requests.filter(
    (request) =>
      visibleProjectIds.has(request.projectId) &&
      canViewEntity(user, request) &&
      (!request.folderId || visibleFolderIds.has(request.folderId)),
  );

  const projectTree = visibleProjects.map((project) => {
    const projectFolders = visibleFolders
      .filter((folder) => folder.projectId === project._id)
      .sort((a, b) => a.order - b.order)
      .map((folder) => ({
        ...folder,
        requests: visibleRequests
          .filter(
            (request) =>
              request.projectId === project._id &&
              request.folderId === folder._id,
          )
          .sort((a, b) => a.order - b.order),
      }));

    return {
      ...project,
      folders: projectFolders,
      requests: visibleRequests
        .filter(
          (request) => request.projectId === project._id && !request.folderId,
        )
        .sort((a, b) => a.order - b.order),
    };
  });

  return {
    workspace: sanitizeWorkspace(workspace),
    projects: projectTree.sort((a, b) => a.order - b.order),
  };
}
