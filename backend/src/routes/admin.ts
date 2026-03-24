import type { FastifyPluginAsync } from "fastify";
import type { User } from "@restify/shared";
import {
  createId,
  isoNow,
  serializeDoc,
  serializeDocs,
  toObjectId,
  usersCollection,
  workspaceMetaCollection,
} from "../db/collections.js";
import { hashPassword } from "../lib/password.js";
import { getRequiredUser } from "../lib/permissions.js";

async function syncWorkspaceMemberships(
  app: Parameters<FastifyPluginAsync>[0],
  userId: string,
  workspaceIds: string[],
  role: "admin" | "member",
) {
  await workspaceMetaCollection(app.mongo).updateMany(
    { "members.userId": userId },
    { $pull: { members: { userId } } },
  );

  if (workspaceIds.length === 0) {
    return;
  }

  await Promise.all(
    workspaceIds.map((workspaceId) =>
      workspaceMetaCollection(app.mongo).updateOne(
        { _id: toObjectId(workspaceId), ownerId: { $ne: userId } },
        { $addToSet: { members: { userId, role } } },
      ),
    ),
  );
}

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/admin/users", { preHandler: app.authenticate }, async (request) => {
    if (getRequiredUser(request).role !== "superadmin") {
      throw app.httpErrors.forbidden(
        "Only the superadmin can access user management",
      );
    }

    const users = serializeDocs(
      await usersCollection(app.mongo)
        .find({})
        .sort({ createdAt: -1 })
        .toArray(),
    ) as User[];
    return {
      users: users.map((user) => ({ ...user, passwordHash: undefined })),
    };
  });

  app.post<{
    Body: {
      username: string;
      password: string;
      role: "admin" | "member";
      workspaceIds?: string[];
    };
  }>("/admin/users", { preHandler: app.authenticate }, async (request) => {
    const currentUser = getRequiredUser(request);
    if (currentUser.role !== "superadmin") {
      throw app.httpErrors.forbidden("Only the superadmin can create users");
    }

    const now = isoNow();
    const userId = createId();
    const userRecord = {
      _id: userId,
      username: request.body.username.trim(),
      passwordHash: await hashPassword(request.body.password),
      role: request.body.role,
      createdBy: currentUser._id,
      workspaceIds: request.body.workspaceIds ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await usersCollection(app.mongo).insertOne(userRecord as never);
    await syncWorkspaceMemberships(
      app,
      userId.toHexString(),
      userRecord.workspaceIds,
      userRecord.role,
    );

    return {
      user: { ...(serializeDoc(userRecord) as User), passwordHash: undefined },
    };
  });

  app.patch<{
    Params: { userId: string };
    Body: {
      username?: string;
      password?: string;
      role?: "admin" | "member";
      workspaceIds?: string[];
    };
  }>(
    "/admin/users/:userId",
    { preHandler: app.authenticate },
    async (request) => {
      if (getRequiredUser(request).role !== "superadmin") {
        throw app.httpErrors.forbidden("Only the superadmin can update users");
      }

      const existingUser = await usersCollection(app.mongo).findOne({
        _id: toObjectId(request.params.userId),
      });
      if (!existingUser) {
        throw app.httpErrors.notFound("User not found");
      }

      const patch: Record<string, unknown> = { updatedAt: isoNow() };
      if (request.body.username) {
        patch.username = request.body.username.trim();
      }
      if (request.body.password) {
        patch.passwordHash = await hashPassword(request.body.password);
      }
      if (request.body.role) {
        patch.role = request.body.role;
      }
      if (request.body.workspaceIds) {
        patch.workspaceIds = request.body.workspaceIds;
      }

      await usersCollection(app.mongo).updateOne(
        { _id: existingUser._id },
        { $set: patch },
      );
      await syncWorkspaceMemberships(
        app,
        request.params.userId,
        request.body.workspaceIds ?? existingUser.workspaceIds,
        (request.body.role ?? existingUser.role) as "admin" | "member",
      );

      const updatedUser = await usersCollection(app.mongo).findOne({
        _id: existingUser._id,
      });
      return {
        user: {
          ...(serializeDoc(updatedUser!) as User),
          passwordHash: undefined,
        },
      };
    },
  );

  app.delete<{ Params: { userId: string } }>(
    "/admin/users/:userId",
    { preHandler: app.authenticate },
    async (request) => {
      if (getRequiredUser(request).role !== "superadmin") {
        throw app.httpErrors.forbidden("Only the superadmin can delete users");
      }

      await usersCollection(app.mongo).deleteOne({
        _id: toObjectId(request.params.userId),
      });
      await workspaceMetaCollection(app.mongo).updateMany(
        { "members.userId": request.params.userId },
        { $pull: { members: { userId: request.params.userId } } },
      );

      return { success: true };
    },
  );
};

export default adminRoutes;
