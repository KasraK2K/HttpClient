import { timingSafeEqual } from "node:crypto";
import type {
  AdminUser,
  BootstrapStatusResponse,
  ChangeMyPasswordPayload,
  CreateSuperuserPayload,
  LoginPayload,
  MeResponse,
  UpdateProfilePayload,
  User,
} from "@reqloom/shared";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { findUserByUsername, hasAnyAdmins, sanitizeAuthUser } from "../db/bootstrap.js";
import {
  adminsCollection,
  createId,
  isoNow,
  toObjectId,
  usersCollection,
} from "../db/collections.js";
import { getRequiredUser } from "../lib/permissions.js";
import { comparePassword, hashPassword } from "../lib/password.js";

function isRequestSecure(request: FastifyRequest): boolean {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const normalizedForwardedProto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0];

  return request.protocol === "https" || normalizedForwardedProto?.trim() === "https";
}

function resolveCookieSecure(
  app: Parameters<FastifyPluginAsync>[0],
  request: FastifyRequest,
): boolean {
  return app.config.cookieSecure === "auto"
    ? isRequestSecure(request)
    : app.config.cookieSecure;
}

function setupSecretsMatch(
  providedSecret: string | undefined,
  expectedSecret: string,
): boolean {
  if (!providedSecret) {
    return false;
  }

  const provided = Buffer.from(providedSecret);
  const expected = Buffer.from(expectedSecret);
  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

function cookieOptions(
  app: Parameters<FastifyPluginAsync>[0],
  request: FastifyRequest,
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: resolveCookieSecure(app, request),
    path: "/",
    domain: app.config.cookieDomain,
  };
}

function getTrimmedRequiredValue(
  value: string | undefined,
  fieldName: string,
  app: Parameters<FastifyPluginAsync>[0],
): string {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw app.httpErrors.badRequest(`${fieldName} is required`);
  }

  return trimmedValue;
}

function getAuthCollection(
  app: Parameters<FastifyPluginAsync>[0],
  role: AdminUser["role"] | User["role"],
) {
  return role === "superadmin"
    ? adminsCollection(app.mongo)
    : usersCollection(app.mongo);
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.get("/auth/bootstrap-status", async () => ({
    needsSuperuser: !(await hasAnyAdmins(app.mongo)),
    requiresSetupSecret: Boolean(app.config.superuserBootstrapSecret),
    historyLimit: app.config.historyLimit,
  } satisfies BootstrapStatusResponse));

  app.post<{ Body: CreateSuperuserPayload }>(
    "/auth/bootstrap-superuser",
    async (request, reply) => {
      if (await hasAnyAdmins(app.mongo)) {
        throw app.httpErrors.conflict("A superuser already exists");
      }

      const { name, username, password, confirmPassword, setupSecret } = request.body;
      if (
        app.config.superuserBootstrapSecret &&
        !setupSecretsMatch(setupSecret, app.config.superuserBootstrapSecret)
      ) {
        throw app.httpErrors.unauthorized(
          "A valid setup secret is required to create the first superuser",
        );
      }

      const trimmedName = getTrimmedRequiredValue(name, "Name", app);
      const trimmedUsername = getTrimmedRequiredValue(username, "Username", app);
      if (!password) {
        throw app.httpErrors.badRequest("Password is required");
      }

      if (password !== confirmPassword) {
        throw app.httpErrors.badRequest("Passwords do not match");
      }

      const now = isoNow();
      const adminId = createId();
      const adminRecord = {
        _id: adminId,
        name: trimmedName,
        username: trimmedUsername,
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

      reply.setCookie(app.config.cookieName, token, cookieOptions(app, request));

      return {
        user: sanitizeAuthUser(adminRecord),
      } satisfies MeResponse;
    },
  );

  app.post<{ Body: LoginPayload }>("/auth/login", async (request, reply) => {
    const trimmedUsername = getTrimmedRequiredValue(
      request.body.username,
      "Username",
      app,
    );
    if (!request.body.password) {
      throw app.httpErrors.badRequest("Password is required");
    }

    const userRecord = await findUserByUsername(app.mongo, trimmedUsername);
    if (
      !userRecord ||
      !(await comparePassword(request.body.password, userRecord.passwordHash))
    ) {
      throw app.httpErrors.unauthorized("Invalid username or password");
    }

    const token = await reply.jwtSign({
      sub: userRecord._id.toHexString(),
      username: userRecord.username,
      role: userRecord.role,
    });

    reply.setCookie(app.config.cookieName, token, cookieOptions(app, request));

    return {
      user: sanitizeAuthUser(userRecord),
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

  app.patch<{ Body: UpdateProfilePayload }>(
    "/auth/me/profile",
    { preHandler: app.authenticate },
    async (request) => {
      const currentUser = getRequiredUser(request);
      const name = getTrimmedRequiredValue(request.body.name, "Name", app);
      const collection = getAuthCollection(app, currentUser.role);

      await collection.updateOne(
        { _id: toObjectId(currentUser._id) },
        { $set: { name, updatedAt: isoNow() } },
      );

      const updatedUser = await collection.findOne({ _id: toObjectId(currentUser._id) });
      if (!updatedUser) {
        throw app.httpErrors.notFound("User not found");
      }

      request.currentUser = sanitizeAuthUser(updatedUser);
      return { user: request.currentUser } satisfies MeResponse;
    },
  );

  app.patch<{ Body: ChangeMyPasswordPayload }>(
    "/auth/me/password",
    { preHandler: app.authenticate },
    async (request) => {
      const currentUser = getRequiredUser(request);
      const { currentPassword, newPassword, confirmPassword } = request.body;

      if (!currentPassword) {
        throw app.httpErrors.badRequest("Current password is required");
      }
      if (!newPassword) {
        throw app.httpErrors.badRequest("New password is required");
      }
      if (newPassword !== confirmPassword) {
        throw app.httpErrors.badRequest("Passwords do not match");
      }

      const collection = getAuthCollection(app, currentUser.role);
      const userRecord = await collection.findOne({ _id: toObjectId(currentUser._id) });
      if (!userRecord) {
        throw app.httpErrors.notFound("User not found");
      }

      const passwordMatches = await comparePassword(
        currentPassword,
        userRecord.passwordHash,
      );
      if (!passwordMatches) {
        throw app.httpErrors.unauthorized("Current password is incorrect");
      }

      await collection.updateOne(
        { _id: userRecord._id },
        {
          $set: {
            passwordHash: await hashPassword(newPassword),
            updatedAt: isoNow(),
          },
        },
      );

      return { success: true };
    },
  );
};

export default authRoutes;
