import { describe, expect, it } from "vitest";
import { isSameLanguage } from "./isSameLanguage.ts";

describe("isSameLanguage", () => {
  it("matches tags with the same primary subtag", () => {
    expect(isSameLanguage("en-US", "EN")).toBe(true);
  });

  it("does not match different languages", () => {
    expect(isSameLanguage("de", "en")).toBe(false);
  });
});
