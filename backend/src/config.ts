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

export function loadConfig(): AppConfig {
  return {
    port: toNumber(process.env.PORT, 4000),
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
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    nodeEnv: process.env.NODE_ENV ?? "development",
    unlockTtlMinutes: toNumber(process.env.UNLOCK_TTL_MINUTES, 15),
    frontendDistDir: path.resolve(process.cwd(), "../frontend/dist"),
  };
}
