import type {
  HistoryDoc,
  ProjectDoc,
  RequestDoc,
  User,
  WorkspaceMeta,
} from "@restify/shared";
import { ObjectId, type Db, type Document, type OptionalId } from "mongodb";

export type AdminRecord = {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  role: "superadmin";
  createdAt: string;
  updatedAt?: string;
};

export type UserRecord = {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  role: "admin" | "member";
  createdBy: string;
  workspaceIds: string[];
  createdAt: string;
  updatedAt?: string;
};

export type WorkspaceMetaRecord = Omit<WorkspaceMeta, "_id"> & {
  _id: ObjectId;
};
export type ProjectRecord = Omit<ProjectDoc, "_id"> & { _id: ObjectId };
export type FolderRecord = {
  _id: ObjectId;
  entityType: "folder";
  workspaceId: string;
  projectId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt?: string;
};
export type RequestRecord = Omit<RequestDoc, "_id"> & { _id: ObjectId };
export type HistoryRecord = Omit<HistoryDoc, "_id"> & { _id: ObjectId };

export function createId(): ObjectId {
  return new ObjectId();
}

export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }

  return new ObjectId(id);
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function serializeDoc<T extends Document>(
  doc: T | null,
): (Omit<T, "_id"> & { _id: string }) | null {
  if (!doc) {
    return null;
  }

  return {
    ...(doc as T),
    _id: doc._id.toHexString(),
  };
}

export function serializeDocs<T extends Document>(
  docs: T[],
): Array<Omit<T, "_id"> & { _id: string }> {
  return docs.map((doc) => ({
    ...(doc as T),
    _id: doc._id.toHexString(),
  }));
}

export function workspaceCollectionName(workspaceId: string): string {
  return `workspaces_${workspaceId}`;
}

export function adminsCollection(db: Db) {
  return db.collection<AdminRecord>("admins");
}

export function usersCollection(db: Db) {
  return db.collection<UserRecord>("users");
}

export function workspaceMetaCollection(db: Db) {
  return db.collection<WorkspaceMetaRecord>("workspace_meta");
}

export function workspaceDataCollection(db: Db, workspaceId: string) {
  return db.collection<
    ProjectRecord | FolderRecord | RequestRecord | HistoryRecord
  >(workspaceCollectionName(workspaceId));
}

export function toOptionalId<T extends Document>(
  doc: OptionalId<T>,
): OptionalId<T> {
  return doc;
}

export function withoutPassword<T extends { passwordHash?: string }>(
  record: T,
): Omit<T, "passwordHash"> {
  const clone = { ...record };
  delete clone.passwordHash;
  return clone;
}

export type AnyWorkspaceRecord =
  | ProjectRecord
  | FolderRecord
  | RequestRecord
  | HistoryRecord;
export type SanitizedUser = Omit<User, "passwordHash">;
