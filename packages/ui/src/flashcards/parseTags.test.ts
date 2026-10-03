import { describe, expect, it } from "vitest";
import { parseTags } from "./parseTags.ts";

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
