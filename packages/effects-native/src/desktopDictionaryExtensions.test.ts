import { describe, expect, it } from "vitest";
import { desktopDictionaryExtensions } from "./desktopDictionaryExtensions.ts";

describe("desktopDictionaryExtensions", () => {
  it("offers the index file of a StarDict dictionary", () => {
    expect(desktopDictionaryExtensions([".zip"])).toEqual([".zip", ".ifo"]);
  });
});
