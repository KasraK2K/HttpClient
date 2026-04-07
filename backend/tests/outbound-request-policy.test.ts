import { describe, expect, it } from "vitest";
import { assertAllowedOutboundUrl } from "../src/lib/outbound-request-policy.js";

describe("assertAllowedOutboundUrl", () => {
  it("blocks loopback targets when private networks are disabled", async () => {
    await expect(
      assertAllowedOutboundUrl(
        "http://127.0.0.1:8080",
        {
          allowPrivateNetworkTargets: false,
          allowedOutboundHosts: [],
        },
        async () => [{ address: "127.0.0.1", family: 4 }],
      ),
    ).rejects.toThrow(/private network targets are blocked/i);
  });

  it("allows explicitly approved public hosts", async () => {
    await expect(
      assertAllowedOutboundUrl(
        "https://api.example.com/users",
        {
          allowPrivateNetworkTargets: false,
          allowedOutboundHosts: ["api.example.com"],
        },
        async () => [{ address: "93.184.216.34", family: 4 }],
      ),
    ).resolves.toBeUndefined();
  });
});
