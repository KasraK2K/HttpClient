import fp from "fastify-plugin";
import { MongoClient } from "mongodb";
import {
  adminsCollection,
  usersCollection,
  workspaceMetaCollection,
} from "../db/collections.js";

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

  app.addHook("onClose", async () => {
    await client.close();
  });
});
