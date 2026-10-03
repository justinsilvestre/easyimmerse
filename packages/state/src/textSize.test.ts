import { describe, expect, it } from "vitest";
import { parseTextSize } from "./textSize.ts";

describe("parseTextSize", () => {
  it("accepts a known size", () => {
    expect(parseTextSize("large")).toBe("large");
  });

  it("falls back to medium for an unknown value", () => {
    expect(parseTextSize("huge")).toBe("medium");
  });

  it("falls back to medium when nothing is stored", () => {
    expect(parseTextSize(undefined)).toBe("medium");
  });
});
