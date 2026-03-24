import path from "node:path";
import dotenv from "dotenv";
import { buildApp } from "./app.js";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const app = await buildApp();

try {
  await app.listen({
    port: app.config.port,
    host: "0.0.0.0",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
