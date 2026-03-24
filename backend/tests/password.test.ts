import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "../src/lib/password.js";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("restify-secret");
    await expect(comparePassword("restify-secret", hash)).resolves.toBe(true);
    await expect(comparePassword("wrong", hash)).resolves.toBe(false);
  });
});
