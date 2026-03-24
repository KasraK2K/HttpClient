import type {
  AdminUser,
  CreateSuperuserPayload,
  LoginPayload,
  MeResponse,
  User,
} from "@restify/shared";
import type { FastifyPluginAsync } from "fastify";
import { findUserByUsername, hasAnyAdmins } from "../db/bootstrap.js";
import {
  adminsCollection,
  createId,
  isoNow,
  serializeDoc,
  withoutPassword,
} from "../db/collections.js";
import { comparePassword, hashPassword } from "../lib/password.js";

function cookieOptions(app: Parameters<FastifyPluginAsync>[0]) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: app.config.cookieSecure,
    path: "/",
    domain: app.config.cookieDomain,
  };
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/auth/bootstrap-status", async () => ({
    needsSuperuser: !(await hasAnyAdmins(app.mongo)),
  }));

  app.post<{ Body: CreateSuperuserPayload }>(
    "/auth/bootstrap-superuser",
    async (request, reply) => {
      if (await hasAnyAdmins(app.mongo)) {
        throw app.httpErrors.conflict("A superuser already exists");
      }

      const { username, password, confirmPassword } = request.body;
      if (!username?.trim() || !password) {
        throw app.httpErrors.badRequest("Username and password are required");
      }

      if (password !== confirmPassword) {
        throw app.httpErrors.badRequest("Passwords do not match");
      }

      const now = isoNow();
      const adminId = createId();
      const adminRecord = {
        _id: adminId,
        username: username.trim(),
        passwordHash: await hashPassword(password),
        role: "superadmin" as const,
        createdAt: now,
        updatedAt: now,
      };

      await adminsCollection(app.mongo).insertOne(adminRecord);

      const token = await reply.jwtSign({
        sub: adminId.toHexString(),
        username: adminRecord.username,
        role: adminRecord.role,
      });

      reply.setCookie(app.config.cookieName, token, cookieOptions(app));

      return {
        user: withoutPassword(serializeDoc(adminRecord)!),
      } satisfies MeResponse;
    },
  );

  app.post<{ Body: LoginPayload }>("/auth/login", async (request, reply) => {
    const { username, password } = request.body;
    const userRecord = await findUserByUsername(app.mongo, username.trim());
    if (
      !userRecord ||
      !(await comparePassword(password, userRecord.passwordHash))
    ) {
      throw app.httpErrors.unauthorized("Invalid username or password");
    }

    const token = await reply.jwtSign({
      sub: userRecord._id.toHexString(),
      username: userRecord.username,
      role: userRecord.role,
    });

    reply.setCookie(app.config.cookieName, token, cookieOptions(app));

    const serializedUser = withoutPassword(serializeDoc(userRecord)!) as
      | AdminUser
      | User;

    return {
      user: serializedUser,
    } satisfies MeResponse;
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie(app.config.cookieName, {
      path: "/",
      domain: app.config.cookieDomain,
    });
    return { success: true };
  });

  app.get("/auth/me", async (request) => {
    try {
      await app.authenticate(request);
      return { user: request.currentUser ?? null } satisfies MeResponse;
    } catch {
      return { user: null } satisfies MeResponse;
    }
  });
};

export default authRoutes;
