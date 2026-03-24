import { describe, expect, it } from "vitest";
import { detectContentKind } from "./content-type";

describe("detectContentKind", () => {
  it("classifies JSON", () => {
    expect(detectContentKind("application/json; charset=utf-8")).toBe("json");
  });

  it("classifies images", () => {
    expect(detectContentKind("image/png")).toBe("image");
  });

  it("falls back to binary", () => {
    expect(detectContentKind("application/octet-stream")).toBe("binary");
  });
});
