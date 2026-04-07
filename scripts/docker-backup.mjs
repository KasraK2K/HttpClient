import { mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const backupRoot = path.resolve(process.cwd(), "backup");
mkdirSync(backupRoot, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = `/backup/${timestamp}`;

function buildDefaultMongoUri() {
  const database = process.env.MONGODB_DATABASE ?? "restify";
  const username = process.env.MONGODB_APP_USERNAME ?? "httpclient";
  const password = process.env.MONGODB_APP_PASSWORD ?? "change-this-app-password";
  return `mongodb://${username}:${password}@127.0.0.1:27017/${database}?authSource=${database}`;
}

const mongoUri =
  process.env.DOCKER_MONGODB_BACKUP_URI ?? buildDefaultMongoUri();
const command = `mkdir -p "${backupPath}" && mongodump --uri="${mongoUri}" --out="${backupPath}"`;

console.log(`Creating MongoDB backup in ./backup/${timestamp}`);

const result = spawnSync(
  "docker",
  ["compose", "exec", "-T", "mongodb", "sh", "-lc", command],
  {
    stdio: "inherit",
    shell: false,
  },
);

if (result.status !== 0) {
  console.error("MongoDB backup failed. Make sure the mongodb container is running with `npm run db:up` or `npm run docker:up`.");
  process.exit(result.status ?? 1);
}

console.log(`Backup completed: ./backup/${timestamp}`);
