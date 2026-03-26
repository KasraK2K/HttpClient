import path from "node:path";

export interface AppConfig {
  port: number;
  mongoUri: string;
  mongoServerSelectionTimeoutMs: number;
  jwtSecret: string;
  cookieName: string;
  cookieDomain?: string;
  cookieSecure: boolean;
  frontendOrigin: string;
  frontendOrigins: string[];
  nodeEnv: string;
  unlockTtlMinutes: number;
  frontendDistDir: string;
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

function parseFrontendOrigins(value: string | undefined): string[] {
  const defaults = ["http://127.0.0.1:3030", "http://localhost:3030"];
  const configured = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...defaults])];
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

export function loadConfig(): AppConfig {
  const frontendOrigins = parseFrontendOrigins(process.env.FRONTEND_ORIGIN);

  return {
    port: resolvePort(),
    mongoUri: process.env.MONGODB_URI ?? "mongodb://localhost:27017/restify",
    mongoServerSelectionTimeoutMs: toNumber(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
      5000,
    ),
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    cookieName: process.env.COOKIE_NAME ?? "restify_session",
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    cookieSecure: toBoolean(
      process.env.COOKIE_SECURE,
      process.env.NODE_ENV === "production",
    ),
    frontendOrigin: frontendOrigins[0],
    frontendOrigins,
    nodeEnv: process.env.NODE_ENV ?? "development",
    unlockTtlMinutes: toNumber(process.env.UNLOCK_TTL_MINUTES, 15),
    frontendDistDir: path.resolve(process.cwd(), "../frontend/dist"),
  };
}
