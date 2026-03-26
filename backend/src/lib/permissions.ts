import type {
  AdminUser,
  FolderDoc,
  ProjectDoc,
  RequestDoc,
  User,
  WorkspaceMeta,
} from "@restify/shared";
import type { FastifyRequest } from "fastify";

type PrivateEntity = Pick<ProjectDoc | FolderDoc | RequestDoc, "isPrivate">;

export function getRequiredUser(request: FastifyRequest): AdminUser | User {
  if (!request.currentUser) {
    throw new Error("User missing from authenticated request");
  }

  return request.currentUser;
}

export function canManageWorkspace(
  user: AdminUser | User,
  workspace: WorkspaceMeta,
): boolean {
  return user.role === "superadmin" || workspace.ownerId === user._id;
}

export function canManageProject(
  user: AdminUser | User,
  project: ProjectDoc,
  workspace: WorkspaceMeta,
): boolean {
  return (
    user.role === "superadmin" ||
    project.ownerId === user._id ||
    workspace.ownerId === user._id
  );
}

export function canAccessWorkspace(
  user: AdminUser | User,
  workspace: WorkspaceMeta,
): boolean {
  return (
    user.role === "superadmin" ||
    workspace.ownerId === user._id ||
    workspace.members.some((member) => member.userId === user._id)
  );
}

export function canManagePrivateEntities(user: AdminUser | User): boolean {
  return user.role !== "member";
}

export function canViewEntity(
  user: AdminUser | User,
  entity?: PrivateEntity | null,
): boolean {
  return !entity || !Boolean(entity.isPrivate) || canManagePrivateEntities(user);
}
