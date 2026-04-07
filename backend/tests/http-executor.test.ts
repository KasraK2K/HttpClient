import { describe, expect, it, vi } from "vitest";
import { executeHttpRequest } from "../src/lib/http-executor.js";

describe("executeHttpRequest", () => {
  it("returns structured metadata for text responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "text/plain" }),
        arrayBuffer: async () => new TextEncoder().encode("hello").buffer,
      }),
    );

    const result = await executeHttpRequest(
      {
        workspaceId: "workspace-1",
        projectId: "project-1",
        method: "GET",
        url: "https://example.com",
        headers: [],
        params: [],
        body: { type: "none" },
        auth: { type: "none" },
      },
      {
        allowPrivateNetworkTargets: false,
        allowedOutboundHosts: ["example.com"],
      },
    );

    expect(result.status).toBe(200);
    expect(result.textBody).toBe("hello");
    expect(result.contentKind).toBe("text");
  });
});
