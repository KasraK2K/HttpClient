import type { ExecuteRequestPayload } from "@restify/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { executeHttpRequest } from "./http-executor.js";

describe("executeHttpRequest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("forwards the abort signal to fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "content-type": "application/json",
      }),
      arrayBuffer: async () => new TextEncoder().encode("{}").buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    const payload: ExecuteRequestPayload = {
      workspaceId: "workspace-1",
      projectId: "project-1",
      requestId: "request-1",
      method: "GET",
      url: "https://api.example.com/users",
      headers: [],
      params: [],
      auth: { type: "none" },
      body: { type: "none" },
    };

    await executeHttpRequest(payload, controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit];

    expect(init.signal).toBe(controller.signal);
  });
});