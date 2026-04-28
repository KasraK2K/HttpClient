import Fastify from "fastify";
import fastifySensible from "@fastify/sensible";
import type { AppConfig } from "../config.js";
import { migrateUserNames } from "../db/bootstrap.js";
import type { AdminRecord, UserRecord } from "../db/collections.js";
import adminRoutes from "../routes/admin.js";
import authRoutes from "../routes/auth.js";
import jwtPlugin from "../plugins/jwt.js";
import { afterEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { comparePassword, hashPassword } from "../lib/password.js";

type TestDoc = Record<string, unknown> & { _id: ObjectId };

type Filter = Record<string, unknown>;

function getFieldValue(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (value == null || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, record);
}

function valuesEqual(left: unknown, right: unknown) {
  if (left instanceof ObjectId && right instanceof ObjectId) {
    return left.equals(right);
  }

  return left === right;
}

function matchesFilter(record: Record<string, unknown>, filter: Filter): boolean {
  const orConditions = filter.$or;
  if (Array.isArray(orConditions)) {
    return orConditions.some((condition) =>
      matchesFilter(record, condition as Filter),
    );
  }

  return Object.entries(filter).every(([field, expected]) => {
    const actual = getFieldValue(record, field);

    if (
      expected &&
      typeof expected === "object" &&
      !Array.isArray(expected) &&
      !(expected instanceof ObjectId)
    ) {
      if ("$exists" in expected) {
        return (expected.$exists as boolean)
          ? actual !== undefined
          : actual === undefined;
      }

      if ("$ne" in expected) {
        return !valuesEqual(actual, expected.$ne);
      }
    }

    return valuesEqual(actual, expected);
  });
}

function applySet(
  record: Record<string, unknown>,
  values: Record<string, unknown>,
  resolveFieldReferences = false,
) {
  for (const [field, value] of Object.entries(values)) {
    if (
      resolveFieldReferences &&
      typeof value === "string" &&
      value.startsWith("$")
    ) {
      record[field] = getFieldValue(record, value.slice(1));
      continue;
    }

    record[field] = value;
  }
}

function applyUpdate(record: Record<string, unknown>, update: unknown) {
  if (Array.isArray(update)) {
    for (const stage of update) {
      if (stage && typeof stage === "object" && "$set" in stage) {
        applySet(record, stage.$set as Record<string, unknown>, true);
      }
    }
    return;
  }

  if (!update || typeof update !== "object") {
    return;
  }

  if ("$set" in update) {
    applySet(record, update.$set as Record<string, unknown>);
  }
}

class FakeCollection<T extends TestDoc> {
  constructor(private readonly records: T[]) {}

  async countDocuments(filter: Filter = {}, options?: { limit?: number }) {
    const matches = this.records.filter((record) => matchesFilter(record, filter));
    if (options?.limit) {
      return matches.slice(0, options.limit).length;
    }

    return matches.length;
  }

  async findOne(filter: Filter) {
    return this.records.find((record) => matchesFilter(record, filter)) ?? null;
  }

  async insertOne(record: T) {
    this.records.push(record);
    return { insertedId: record._id };
  }

  async updateOne(filter: Filter, update: unknown) {
    const record = this.records.find((item) => matchesFilter(item, filter));
    if (!record) {
      return { modifiedCount: 0 };
    }

    applyUpdate(record, update);
    return { modifiedCount: 1 };
  }

  async updateMany(filter: Filter, update: unknown) {
    let modifiedCount = 0;

    for (const record of this.records) {
      if (!matchesFilter(record, filter)) {
        continue;
      }

      applyUpdate(record, update);
      modifiedCount += 1;
    }

    return { modifiedCount };
  }

  async deleteOne(filter: Filter) {
    const recordIndex = this.records.findIndex((item) => matchesFilter(item, filter));
    if (recordIndex === -1) {
      return { deletedCount: 0 };
    }

    this.records.splice(recordIndex, 1);
    return { deletedCount: 1 };
  }

  find(filter: Filter = {}): { sort: (sortSpec: Record<string, 1 | -1>) => { toArray: () => Promise<T[]> }; toArray: () => Promise<T[]> } {
    const records = this.records.filter((record) => matchesFilter(record, filter));

    return {
      sort: (sortSpec: Record<string, 1 | -1>) => {
        const [[field, direction]] = Object.entries(sortSpec);
        const sorted = [...records].sort((left, right) => {
          const leftValue = getFieldValue(left, field) as string | number | undefined;
          const rightValue = getFieldValue(right, field) as string | number | undefined;

          if (leftValue === rightValue) {
            return 0;
          }

          if (leftValue === undefined) {
            return 1;
          }

          if (rightValue === undefined) {
            return -1;
          }

          if (leftValue < rightValue) {
            return -1 * direction;
          }

          return 1 * direction;
        });

        return {
          toArray: async () => sorted,
        };
      },
      toArray: async () => records,
    };
  }

  async createIndex() {
    return "fake-index";
  }
}

class FakeDb {
  admins: AdminRecord[] = [];
  users: UserRecord[] = [];
  workspaceMeta: TestDoc[] = [];

  collection(name: string) {
    if (name === "admins") {
      return new FakeCollection(this.admins);
    }

    if (name === "users") {
      return new FakeCollection(this.users);
    }

    if (name === "workspace_meta") {
      return new FakeCollection(this.workspaceMeta);
    }

    throw new Error(`Unknown collection: ${name}`);
  }
}

function createTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    mongoUri: "mongodb://localhost:27017/restify-test",
    mongoServerSelectionTimeoutMs: 100,
    jwtSecret: "test-jwt-secret-that-is-long-enough-123456",
    dataEncryptionKey: "test-data-secret-that-is-long-enough-123456",
    cookieName: "restify_session",
    cookieDomain: undefined,
    cookieSecure: false,
    frontendOrigin: "http://localhost:3030",
    frontendOrigins: ["http://localhost:3030"],
    nodeEnv: "test",
    unlockTtlMinutes: 15,
    frontendDistDir: "",
    superuserBootstrapSecret: undefined,
    allowPrivateNetworkTargets: true,
    allowedOutboundHosts: [],
    historyLimit: 250,
    ...overrides,
  };
}

async function buildTestApp(db: FakeDb, configOverrides: Partial<AppConfig> = {}) {
  const app = Fastify();
  app.decorate("config", createTestConfig(configOverrides));
  app.decorate("mongo", db as never);

  await app.register(fastifySensible);
  await app.register(jwtPlugin);
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api" });
  await app.ready();

  return app;
}

async function loginAndGetCookie(
  app: Awaited<ReturnType<typeof buildTestApp>>,
  username: string,
  password: string,
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { username, password },
  });

  expect(response.statusCode).toBe(200);

  const setCookieHeader = response.headers["set-cookie"];
  const cookie = Array.isArray(setCookieHeader)
    ? setCookieHeader[0]
    : setCookieHeader;

  expect(cookie).toBeTruthy();
  return cookie!.split(";")[0];
}

function createAdminRecord(overrides: Partial<AdminRecord> = {}): AdminRecord {
  return {
    _id: new ObjectId(),
    name: "Super Admin",
    username: "superadmin",
    passwordHash: "",
    role: "superadmin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    _id: new ObjectId(),
    name: "Member User",
    username: "member",
    passwordHash: "",
    role: "member",
    createdBy: new ObjectId().toHexString(),
    workspaceIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

let app: Awaited<ReturnType<typeof buildTestApp>> | null = null;

afterEach(async () => {
  await app?.close();
  app = null;
});

describe("auth and account routes", () => {
  it("creates the first superuser with a required name", async () => {
    const db = new FakeDb();
    app = await buildTestApp(db);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/bootstrap-superuser",
      payload: {
        name: "Kasra Samiei",
        username: "superadmin",
        password: "strong-password",
        confirmPassword: "strong-password",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      name: "Kasra Samiei",
      username: "superadmin",
      role: "superadmin",
    });
    expect(db.admins[0]?.name).toBe("Kasra Samiei");
  });

  it("returns a username fallback as the name for legacy users without a stored name", async () => {
    const db = new FakeDb();
    db.users.push(
      createUserRecord({
        name: undefined,
        username: "legacy-user",
        passwordHash: await hashPassword("legacy-password"),
      }),
    );
    app = await buildTestApp(db);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username: "legacy-user", password: "legacy-password" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      username: "legacy-user",
      name: "legacy-user",
    });
  });

  it("updates the signed-in member profile name", async () => {
    const db = new FakeDb();
    db.users.push(
      createUserRecord({
        name: "Initial Member",
        username: "member-user",
        passwordHash: await hashPassword("member-password"),
      }),
    );
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "member-user", "member-password");
    const response = await app.inject({
      method: "PATCH",
      url: "/api/auth/me/profile",
      headers: { cookie },
      payload: { name: "Updated Member" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ name: "Updated Member" });
    expect(db.users[0]?.name).toBe("Updated Member");
  });

  it("updates the signed-in superadmin profile name", async () => {
    const db = new FakeDb();
    db.admins.push(
      createAdminRecord({
        name: "Original Super Admin",
        username: "boss",
        passwordHash: await hashPassword("boss-password"),
      }),
    );
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "boss", "boss-password");
    const response = await app.inject({
      method: "PATCH",
      url: "/api/auth/me/profile",
      headers: { cookie },
      payload: { name: "Updated Boss" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ name: "Updated Boss" });
    expect(db.admins[0]?.name).toBe("Updated Boss");
  });

  it("changes the signed-in user's password when the current password matches", async () => {
    const db = new FakeDb();
    db.users.push(
      createUserRecord({
        username: "member-change",
        passwordHash: await hashPassword("old-password"),
      }),
    );
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "member-change", "old-password");
    const response = await app.inject({
      method: "PATCH",
      url: "/api/auth/me/password",
      headers: { cookie },
      payload: {
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
    });

    expect(response.statusCode).toBe(200);

    expect(
      await comparePassword("new-password", db.users[0]?.passwordHash),
    ).toBe(true);
  });

  it("rejects self password changes with the wrong current password", async () => {
    const db = new FakeDb();
    db.users.push(
      createUserRecord({
        username: "member-wrong-current",
        passwordHash: await hashPassword("old-password"),
      }),
    );
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "member-wrong-current", "old-password");
    const response = await app.inject({
      method: "PATCH",
      url: "/api/auth/me/password",
      headers: { cookie },
      payload: {
        currentPassword: "incorrect-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("rejects self password changes when confirmation does not match", async () => {
    const db = new FakeDb();
    db.users.push(
      createUserRecord({
        username: "member-mismatch",
        passwordHash: await hashPassword("old-password"),
      }),
    );
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "member-mismatch", "old-password");
    const response = await app.inject({
      method: "PATCH",
      url: "/api/auth/me/password",
      headers: { cookie },
      payload: {
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "different-password",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("requires authentication for self password changes", async () => {
    const db = new FakeDb();
    app = await buildTestApp(db);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/auth/me/password",
      payload: {
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("lets the superadmin reset another user's password", async () => {
    const db = new FakeDb();
    db.admins.push(
      createAdminRecord({
        username: "super-reset",
        passwordHash: await hashPassword("admin-password"),
      }),
    );
    const targetUser = createUserRecord({
      username: "reset-target",
      passwordHash: await hashPassword("old-password"),
    });
    db.users.push(targetUser);
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "super-reset", "admin-password");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${targetUser._id.toHexString()}/password`,
      headers: { cookie },
      payload: {
        newPassword: "reset-password",
        confirmPassword: "reset-password",
      },
    });

    expect(response.statusCode).toBe(200);

    expect(
      await comparePassword("reset-password", targetUser.passwordHash),
    ).toBe(true);
  });

  it("forbids non-superadmins from resetting another user's password", async () => {
    const db = new FakeDb();
    db.users.push(
      createUserRecord({
        username: "member-caller",
        passwordHash: await hashPassword("member-password"),
      }),
    );
    const targetUser = createUserRecord({
      username: "other-user",
      passwordHash: await hashPassword("old-password"),
    });
    db.users.push(targetUser);
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "member-caller", "member-password");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${targetUser._id.toHexString()}/password`,
      headers: { cookie },
      payload: {
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it("returns not found when the superadmin resets a missing user", async () => {
    const db = new FakeDb();
    db.admins.push(
      createAdminRecord({
        username: "super-missing",
        passwordHash: await hashPassword("admin-password"),
      }),
    );
    app = await buildTestApp(db);

    const cookie = await loginAndGetCookie(app, "super-missing", "admin-password");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/users/${new ObjectId().toHexString()}/password`,
      headers: { cookie },
      payload: {
        newPassword: "new-password",
        confirmPassword: "new-password",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("migrates missing user names from usernames", async () => {
    const db = new FakeDb();
    db.admins.push(
      createAdminRecord({
        name: undefined,
        username: "legacy-admin",
      }),
    );
    db.users.push(
      createUserRecord({
        name: undefined,
        username: "legacy-member",
      }),
    );

    const result = await migrateUserNames(db as never);

    expect(result).toEqual({ admins: 1, users: 1 });
    expect(db.admins[0]?.name).toBe("legacy-admin");
    expect(db.users[0]?.name).toBe("legacy-member");
  });
});



