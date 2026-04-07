import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import type {
  HeaderRow,
  HistoryRequestSnapshot,
  ProjectEnvVar,
  RequestAuthConfig,
} from "@restify/shared";
import type { Db } from "mongodb";

const ENCRYPTED_PREFIX = "enc:v1:";
export const REDACTED_SECRET = "[REDACTED]";

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function encryptString(value: string, secret: string): string {
  if (!value) {
    return value;
  }

  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

function decryptString(value: string, secret: string): string {
  if (!value || !value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivBase64, tagBase64, ciphertextBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !ciphertextBase64) {
    throw new Error("Stored encrypted value is malformed");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(secret),
    Buffer.from(ivBase64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function isSensitiveHeaderName(headerName: string): boolean {
  return SENSITIVE_HEADER_NAMES.has(headerName.trim().toLowerCase());
}

function redactString(value?: string): string | undefined {
  return value ? REDACTED_SECRET : value;
}

export function protectProjectEnvVarsForStorage(
  envVars: ProjectEnvVar[],
  secret: string,
): ProjectEnvVar[] {
  return envVars.map((envVar) => ({
    ...envVar,
    value: encryptString(envVar.value, secret),
  }));
}

export function revealProjectEnvVarsFromStorage(
  envVars: ProjectEnvVar[],
  secret: string,
): ProjectEnvVar[] {
  return envVars.map((envVar) => ({
    ...envVar,
    value: decryptString(envVar.value, secret),
  }));
}

export function protectRequestHeadersForStorage(
  headers: HeaderRow[],
  secret: string,
): HeaderRow[] {
  return headers.map((header) =>
    isSensitiveHeaderName(header.key)
      ? { ...header, value: encryptString(header.value, secret) }
      : { ...header },
  );
}

export function revealRequestHeadersFromStorage(
  headers: HeaderRow[],
  secret: string,
): HeaderRow[] {
  return headers.map((header) =>
    isSensitiveHeaderName(header.key)
      ? { ...header, value: decryptString(header.value, secret) }
      : { ...header },
  );
}

export function redactHeadersForHistory(headers: HeaderRow[]): HeaderRow[] {
  return headers.map((header) =>
    isSensitiveHeaderName(header.key)
      ? { ...header, value: redactString(header.value) ?? "" }
      : { ...header },
  );
}

export function redactComputedHeadersForHistory(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      isSensitiveHeaderName(key) ? REDACTED_SECRET : value,
    ]),
  );
}

export function protectRequestAuthForStorage(
  auth: RequestAuthConfig,
  secret: string,
): RequestAuthConfig {
  switch (auth.type) {
    case "bearer":
      return {
        ...auth,
        token: auth.token ? encryptString(auth.token, secret) : auth.token,
      };
    case "basic":
      return {
        ...auth,
        username: auth.username
          ? encryptString(auth.username, secret)
          : auth.username,
        password: auth.password
          ? encryptString(auth.password, secret)
          : auth.password,
      };
    default:
      return { ...auth };
  }
}

export function revealRequestAuthFromStorage(
  auth: RequestAuthConfig,
  secret: string,
): RequestAuthConfig {
  switch (auth.type) {
    case "bearer":
      return {
        ...auth,
        token: auth.token ? decryptString(auth.token, secret) : auth.token,
      };
    case "basic":
      return {
        ...auth,
        username: auth.username
          ? decryptString(auth.username, secret)
          : auth.username,
        password: auth.password
          ? decryptString(auth.password, secret)
          : auth.password,
      };
    default:
      return { ...auth };
  }
}

export function redactRequestAuthForHistory(
  auth: RequestAuthConfig,
): RequestAuthConfig {
  switch (auth.type) {
    case "bearer":
      return {
        ...auth,
        token: redactString(auth.token),
      };
    case "basic":
      return {
        ...auth,
        password: redactString(auth.password),
      };
    default:
      return { ...auth };
  }
}

export function sanitizeHistorySnapshot(
  snapshot: HistoryRequestSnapshot,
): HistoryRequestSnapshot {
  return {
    ...snapshot,
    headers: redactHeadersForHistory(snapshot.headers),
    auth: redactRequestAuthForHistory(snapshot.auth),
    computedHeaders: redactComputedHeadersForHistory(snapshot.computedHeaders),
    secretsRedacted: true,
  };
}

function valuesDiffer<T>(before: T, after: T): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

export async function migrateStoredSecrets(
  db: Db,
  secret: string,
): Promise<{ projects: number; requests: number; histories: number }> {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const workspaceCollectionNames = collections
    .map((collection) => collection.name)
    .filter((name): name is string => Boolean(name?.startsWith("workspaces_")));

  let projects = 0;
  let requests = 0;
  let histories = 0;

  for (const collectionName of workspaceCollectionNames) {
    const collection = db.collection(collectionName);
    const records = await collection
      .find({
        entityType: { $in: ["project", "request", "history"] },
      })
      .toArray();

    const operations: Array<Record<string, unknown>> = [];

    for (const record of records) {
      if (record.entityType === "project" && Array.isArray(record.envVars)) {
        const envVars = protectProjectEnvVarsForStorage(record.envVars, secret);
        if (!valuesDiffer(record.envVars, envVars)) {
          continue;
        }

        projects += 1;
        operations.push({
          updateOne: {
            filter: { _id: record._id, entityType: "project" },
            update: { $set: { envVars } },
          },
        });
        continue;
      }

      if (record.entityType === "request") {
        const headers = Array.isArray(record.headers)
          ? protectRequestHeadersForStorage(record.headers, secret)
          : record.headers;
        const auth =
          record.auth && typeof record.auth === "object"
            ? protectRequestAuthForStorage(
                record.auth as RequestAuthConfig,
                secret,
              )
            : record.auth;

        if (
          !valuesDiffer(record.headers, headers) &&
          !valuesDiffer(record.auth, auth)
        ) {
          continue;
        }

        requests += 1;
        operations.push({
          updateOne: {
            filter: { _id: record._id, entityType: "request" },
            update: { $set: { headers, auth } },
          },
        });
        continue;
      }

      if (
        record.entityType === "history" &&
        record.requestSnapshot &&
        typeof record.requestSnapshot === "object"
      ) {
        const requestSnapshot = sanitizeHistorySnapshot(
          record.requestSnapshot as HistoryRequestSnapshot,
        );

        if (!valuesDiffer(record.requestSnapshot, requestSnapshot)) {
          continue;
        }

        histories += 1;
        operations.push({
          updateOne: {
            filter: { _id: record._id, entityType: "history" },
            update: { $set: { requestSnapshot } },
          },
        });
      }
    }

    if (operations.length > 0) {
      await collection.bulkWrite(operations as never[]);
    }
  }

  return { projects, requests, histories };
}
