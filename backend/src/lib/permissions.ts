import type {
  AdminUser,
  ProjectDoc,
  User,
  WorkspaceMeta,
} from "@restify/shared";
import type { FastifyRequest } from "fastify";

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
