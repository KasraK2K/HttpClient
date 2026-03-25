import type { RequestDoc } from "@restify/shared";
import { describe, expect, it } from "vitest";
import {
  buildExecuteRequestPayload,
  buildParamsFromUrl,
  mergeParamsIntoUrl,
  resolveRequestAuthResolution,
  resolveRequestBodyResolution,
  resolveVariableInputs,
  resolveVariables,
} from "./var-resolver";

describe("resolveVariables", () => {
  it("replaces known variables and reports unresolved ones", () => {
    const result = resolveVariables(
      "https://api.example.com/{{version}}/users/{{userId}}",
      [{ key: "version", value: "v1" }],
    );

    expect(result.output).toBe("https://api.example.com/v1/users/{{userId}}");
    expect(result.resolved).toEqual(["version"]);
    expect(result.unresolved).toEqual(["userId"]);
  });

  it("combines variable state across multiple inputs", () => {
    const result = resolveVariableInputs(
      ["Bearer {{token}}", "{{username}}", "{{missing}}"],
      [
        { key: "token", value: "abc" },
        { key: "username", value: "kasra" },
      ],
    );

    expect(result.resolved).toEqual(["token", "username"]);
    expect(result.unresolved).toEqual(["missing"]);
  });
});

describe("request section variable resolution", () => {
  it("reports variables used in auth and body sections", () => {
    const authResolution = resolveRequestAuthResolution(
      {
        type: "basic",
        username: "{{username}}",
        password: "{{password}}",
      },
      [{ key: "username", value: "service-user" }],
    );
    const bodyResolution = resolveRequestBodyResolution(
      {
        type: "json",
        content: '{"email":"{{email}}","name":"{{missing}}"}',
      },
      [{ key: "email", value: "team@example.com" }],
    );

    expect(authResolution.resolved).toEqual(["username"]);
    expect(authResolution.unresolved).toEqual(["password"]);
    expect(bodyResolution.resolved).toEqual(["email"]);
    expect(bodyResolution.unresolved).toEqual(["missing"]);
  });
});

describe("buildExecuteRequestPayload", () => {
  it("resolves variables across request fields before execution", () => {
    const draft: RequestDoc = {
      _id: "request-1",
      entityType: "request",
      workspaceId: "workspace-1",
      projectId: "project-1",
      folderId: null,
      name: "Users",
      method: "POST",
      url: "https://{{host}}/users",
      headers: [
        {
          id: "header-1",
          key: "X-{{headerKey}}",
          value: "{{headerValue}}",
          enabled: true,
        },
      ],
      params: [
        {
          id: "param-1",
          key: "{{paramKey}}",
          value: "{{paramValue}}",
          enabled: true,
        },
      ],
      body: {
        type: "form-data",
        values: [
          {
            id: "body-1",
            key: "{{bodyKey}}",
            value: "{{bodyValue}}",
            enabled: true,
          },
        ],
      },
      auth: {
        type: "basic",
        username: "{{username}}",
        password: "{{password}}",
      },
      responseHistory: [],
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const payload = buildExecuteRequestPayload(draft, [
      { key: "host", value: "api.example.com" },
      { key: "headerKey", value: "Trace" },
      { key: "headerValue", value: "abc-123" },
      { key: "paramKey", value: "limit" },
      { key: "paramValue", value: "25" },
      { key: "bodyKey", value: "email" },
      { key: "bodyValue", value: "team@example.com" },
      { key: "username", value: "service-user" },
      { key: "password", value: "secret-pass" },
    ]);

    expect(payload.url).toBe("https://api.example.com/users?limit=25");
    expect(payload.headers[0]).toMatchObject({
      key: "X-Trace",
      value: "abc-123",
    });
    expect(payload.params[0]).toMatchObject({
      key: "limit",
      value: "25",
    });
    expect(payload.body).toMatchObject({
      type: "form-data",
      values: [
        expect.objectContaining({
          key: "email",
          value: "team@example.com",
        }),
      ],
    });
    expect(payload.auth).toMatchObject({
      type: "basic",
      username: "service-user",
      password: "secret-pass",
    });
  });

  it("resolves json body content and bearer auth", () => {
    const draft: RequestDoc = {
      _id: "request-2",
      entityType: "request",
      workspaceId: "workspace-1",
      projectId: "project-1",
      folderId: null,
      name: "Create User",
      method: "POST",
      url: "https://api.example.com/users",
      headers: [],
      params: [],
      body: {
        type: "json",
        content: '{"name":"{{name}}"}',
      },
      auth: {
        type: "bearer",
        token: "{{token}}",
      },
      responseHistory: [],
      order: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const payload = buildExecuteRequestPayload(draft, [
      { key: "name", value: "Kasra" },
      { key: "token", value: "abc.def.ghi" },
    ]);

    expect(payload.body).toMatchObject({
      type: "json",
      content: '{"name":"Kasra"}',
    });
    expect(payload.auth).toMatchObject({
      type: "bearer",
      token: "abc.def.ghi",
    });
  });
});

describe("URL param helpers", () => {
  it("extracts params from a URL", () => {
    const params = buildParamsFromUrl(
      "https://example.com/users?limit=20&search=test",
    );
    expect(params).toHaveLength(2);
    expect(params[0]?.key).toBe("limit");
  });

  it("merges enabled params back into the URL", () => {
    const url = mergeParamsIntoUrl("https://example.com/users", [
      { key: "limit", value: "20", enabled: true },
      { key: "search", value: "hello", enabled: true },
    ]);

    expect(url).toContain("limit=20");
    expect(url).toContain("search=hello");
  });
});
