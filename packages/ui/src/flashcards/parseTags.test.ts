import { describe, expect, it } from "vitest";
import { addTags, parseTags, splitTypedTags } from "./parseTags.ts";

describe("parseTags", () => {
  it("splits on commas and trims each tag", () => {
    expect(parseTags(" tv ,dark ")).toEqual(["tv", "dark"]);
  });

  it("drops blanks, such as the one after a trailing comma", () => {
    expect(parseTags("tv,")).toEqual(["tv"]);
  });

  it("drops repeated tags", () => {
    expect(parseTags("tv, tv")).toEqual(["tv"]);
  });
});

describe("splitTypedTags", () => {
  it("keeps text without a comma as the pending tag", () => {
    expect(splitTypedTags("tv").pending).toBe("tv");
  });

  it("finishes the tags before the last comma", () => {
    expect(splitTypedTags("tv, dark, ep").finished).toEqual(["tv", "dark"]);
  });

  it("keeps the text after the last comma pending", () => {
    expect(splitTypedTags("tv, ep").pending).toBe("ep");
  });
});

describe("addTags", () => {
  it("leaves out tags that are already present", () => {
    expect(addTags(["tv"], ["tv", "dark"])).toEqual(["tv", "dark"]);
  });
});
