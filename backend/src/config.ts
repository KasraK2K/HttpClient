import path from "node:path";

export type CookieSecureMode = boolean | "auto";

export interface AppConfig {
  port: number;
  mongoUri: string;
  mongoServerSelectionTimeoutMs: number;
  jwtSecret: string;
  dataEncryptionKey: string;
  cookieName: string;
  cookieDomain?: string;
  cookieSecure: CookieSecureMode;
  frontendOrigin: string;
  frontendOrigins: string[];
  nodeEnv: string;
  unlockTtlMinutes: number;
  frontendDistDir: string;
  superuserBootstrapSecret?: string;
  allowPrivateNetworkTargets: boolean;
  allowedOutboundHosts: string[];
  historyLimit: number;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPositiveInteger(value: string | undefined, fallback: number): number {
  return Math.max(1, Math.floor(toNumber(value, fallback)));
}

function toCookieSecureMode(
  value: string | undefined,
  fallback: CookieSecureMode,
): CookieSecureMode {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "auto") {
    return "auto";
  }

  return ["1", "true", "yes", "on"].includes(normalized);
}

function parseFrontendOrigins(value: string | undefined): string[] {
  const defaults = ["http://127.0.0.1:3030", "http://localhost:3030"];
  const configured = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...defaults])];
}

function parseStringList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolvePort(): number {
  const configuredPort = process.env.BACKEND_PORT ?? process.env.PORT;
  const parsedPort = toNumber(configuredPort, 3500);

  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.BACKEND_PORT &&
    configuredPort === "4000"
  ) {
    return 3500;
  }

  return parsedPort;
}

function validateProductionSecret(
  label: string,
  value: string,
  disallowedValues: string[],
) {
  if (!value || disallowedValues.includes(value) || value.length < 32) {
    throw new Error(
      `${label} must be set to a long random secret before starting the production server.`,
    );
  }
}

export function loadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const frontendOrigins = parseFrontendOrigins(process.env.FRONTEND_ORIGIN);
  const jwtSecret = process.env.JWT_SECRET ?? "dev-secret-change-me";
  const dataEncryptionKey =
    process.env.DATA_ENCRYPTION_KEY ?? "dev-data-encryption-key-change-me";

  if (nodeEnv === "production") {
    validateProductionSecret("JWT_SECRET", jwtSecret, [
      "dev-secret-change-me",
      "replace-with-a-long-random-secret",
    ]);
    validateProductionSecret("DATA_ENCRYPTION_KEY", dataEncryptionKey, [
      "dev-data-encryption-key-change-me",
      "replace-with-a-long-random-secret",
    ]);
  }

  return {
    port: resolvePort(),
    mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/restify",
    mongoServerSelectionTimeoutMs: toNumber(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      5000,
    ),
    jwtSecret,
    dataEncryptionKey,
    cookieName: process.env.COOKIE_NAME ?? "restify_session",
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    cookieSecure: toCookieSecureMode(
      process.env.COOKIE_SECURE,
      nodeEnv === "production" ? "auto" : false,
    ),
    frontendOrigin: frontendOrigins[0],
    frontendOrigins,
    nodeEnv,
    unlockTtlMinutes: toNumber(process.env.UNLOCK_TTL_MINUTES, 15),
    frontendDistDir: path.resolve(process.cwd(), "../frontend/dist"),
    superuserBootstrapSecret:
      process.env.SUPERUSER_BOOTSTRAP_SECRET?.trim() || undefined,
    allowPrivateNetworkTargets: toBoolean(
      process.env.ALLOW_PRIVATE_NETWORK_TARGETS,
      nodeEnv !== "production",
    ),
    allowedOutboundHosts: parseStringList(process.env.ALLOWED_OUTBOUND_HOSTS),
    historyLimit: toPositiveInteger(process.env.HISTORY_LIMIT, 250),
  };
}
