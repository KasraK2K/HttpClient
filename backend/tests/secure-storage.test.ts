import { describe, expect, it } from "vitest";
import {
  protectRequestAuthForStorage,
  protectRequestHeadersForStorage,
  revealRequestAuthFromStorage,
  revealRequestHeadersFromStorage,
  sanitizeHistorySnapshot,
  protectProjectEnvVarsForStorage,
  revealProjectEnvVarsFromStorage,
  REDACTED_SECRET,
} from "../src/lib/secure-storage.js";

describe("secure storage helpers", () => {
  const secret = "integration-test-storage-secret-123456789";

  it("encrypts and restores request credentials and env vars", () => {
    const auth = protectRequestAuthForStorage(
      {
        type: "basic",
        username: "restify",
        password: "secret-password",
      },
      secret,
    );
    const headers = protectRequestHeadersForStorage(
      [
        {
          id: "header-1",
          key: "Authorization",
          value: "Bearer super-secret-token",
          enabled: true,
        },
      ],
      secret,
    );
    const envVars = protectProjectEnvVarsForStorage(
      [{ key: "API_TOKEN", value: "top-secret" }],
      secret,
    );

    expect(auth.username).not.toBe("restify");
    expect(headers[0].value).not.toBe("Bearer super-secret-token");
    expect(envVars[0].value).not.toBe("top-secret");

    expect(revealRequestAuthFromStorage(auth, secret)).toEqual({
      type: "basic",
      username: "restify",
      password: "secret-password",
    });
    expect(revealRequestHeadersFromStorage(headers, secret)[0].value).toBe(
      "Bearer super-secret-token",
    );
    expect(revealProjectEnvVarsFromStorage(envVars, secret)[0].value).toBe(
      "top-secret",
    );
  });

  it("redacts secrets from history snapshots", () => {
    const snapshot = sanitizeHistorySnapshot({
      headers: [
        {
          id: "header-1",
          key: "Authorization",
          value: "Bearer super-secret-token",
          enabled: true,
        },
      ],
      params: [],
      body: { type: "none" },
      auth: { type: "bearer", token: "super-secret-token" },
      computedHeaders: {
        authorization: "Bearer super-secret-token",
        accept: "application/json",
      },
      secretsRedacted: true,
    });

    expect(snapshot.auth.token).toBe(REDACTED_SECRET);
    expect(snapshot.headers[0].value).toBe(REDACTED_SECRET);
    expect(snapshot.computedHeaders.authorization).toBe(REDACTED_SECRET);
    expect(snapshot.computedHeaders.accept).toBe("application/json");
  });
});
