import { describe, expect, it } from "vitest";
import { formatJsonContent } from "./json-format";

describe("formatJsonContent", () => {
  it("pretty prints compact JSON", () => {
    expect(formatJsonContent('{"name":"demo","items":[1,2]}')).toBe(
      '{\n  "name": "demo",\n  "items": [\n    1,\n    2\n  ]\n}',
    );
  });

  it("throws for invalid JSON", () => {
    expect(() => formatJsonContent('{"name":')).toThrow(SyntaxError);
  });
});
