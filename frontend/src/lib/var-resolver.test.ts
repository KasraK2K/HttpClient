import { describe, expect, it } from "vitest";
import {
  buildParamsFromUrl,
  mergeParamsIntoUrl,
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
