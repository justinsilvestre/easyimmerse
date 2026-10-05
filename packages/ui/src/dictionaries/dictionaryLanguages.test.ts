import { describe, expect, it } from "vitest";
import {
  coversLanguage,
  definesInLanguage,
  isSameLanguage,
} from "./dictionaryLanguages.ts";

describe("isSameLanguage", () => {
  it("ignores the script and region of a tag", () => {
    expect(isSameLanguage("zh-Hans", "zh")).toBe(true);
  });

  it("tells different languages apart", () => {
    expect(isSameLanguage("de", "da")).toBe(false);
  });
});

describe("coversLanguage", () => {
  it("counts a dictionary for its source language", () => {
    expect(
      coversLanguage({ source_language: "de", target_language: "en" }, "de"),
    ).toBe(true);
  });

  it("leaves out a dictionary for another language", () => {
    expect(
      coversLanguage({ source_language: "ja", target_language: "en" }, "de"),
    ).toBe(false);
  });

  it("counts a dictionary that does not state its language", () => {
    expect(
      coversLanguage({ source_language: null, target_language: null }, "de"),
    ).toBe(true);
  });
});

describe("definesInLanguage", () => {
  it("counts a dictionary whose definitions are in the language", () => {
    expect(
      definesInLanguage({ source_language: "de", target_language: "en" }, "en"),
    ).toBe(true);
  });

  it("leaves out a dictionary whose definitions are in another language", () => {
    expect(
      definesInLanguage({ source_language: "de", target_language: "de" }, "en"),
    ).toBe(false);
  });
});
