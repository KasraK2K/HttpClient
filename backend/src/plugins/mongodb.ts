import fp from "fastify-plugin";
import { MongoClient } from "mongodb";
import { hasAnyAdmins } from "../db/bootstrap.js";
import {
  adminsCollection,
  usersCollection,
  workspaceMetaCollection,
} from "../db/collections.js";
import { migrateStoredSecrets } from "../lib/secure-storage.js";

export default fp(async function mongodbPlugin(app) {
  const client = new MongoClient(app.config.mongoUri, {
    serverSelectionTimeoutMS: app.config.mongoServerSelectionTimeoutMs,
    connectTimeoutMS: app.config.mongoServerSelectionTimeoutMs,
  });

  try {
    await client.connect();
  } catch (error) {
    app.log.error({ error }, "Failed to connect to MongoDB");
    throw new Error(
      `Unable to connect to MongoDB. Check MONGODB_URI and that the database server is running. Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const database = client.db();
  app.decorate("mongo", database);

  await adminsCollection(database).createIndex(
    { username: 1 },
    { unique: true },
  );
  await usersCollection(database).createIndex(
    { username: 1 },
    { unique: true },
  );
  await workspaceMetaCollection(database).createIndex({ ownerId: 1, order: 1 });

  const migrationResult = await migrateStoredSecrets(
    database,
    app.config.dataEncryptionKey,
  );
  if (
    migrationResult.projects > 0 ||
    migrationResult.requests > 0 ||
    migrationResult.histories > 0
  ) {
    app.log.info(
      migrationResult,
      "Migrated stored request and environment secrets to the secured format",
    );
  }

  if (
    app.config.nodeEnv === "production" &&
    !(await hasAnyAdmins(database)) &&
    !app.config.superuserBootstrapSecret
  ) {
    throw new Error(
      "SUPERUSER_BOOTSTRAP_SECRET must be set before first production startup so the initial superadmin cannot be claimed remotely.",
    );
  }

  app.addHook("onClose", async () => {
    await client.close();
  });
});
