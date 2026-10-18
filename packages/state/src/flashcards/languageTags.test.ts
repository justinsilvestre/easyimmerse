import { describe, expect, it } from "vitest";
import { isSameLanguage } from "./languageTags.ts";

describe("isSameLanguage", () => {
  it("ignores the script and region of a tag", () => {
    expect(isSameLanguage("zh-Hans", "zh")).toBe(true);
  });

  it("tells different languages apart", () => {
    expect(isSameLanguage("de", "da")).toBe(false);
  });
});
