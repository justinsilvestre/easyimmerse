import { describe, expect, it } from "vitest";
import { languageName } from "./languages.ts";

describe("languageName", () => {
  it("names a known language in English", () => {
    expect(languageName("de")).toBe("German");
  });

  it("names a three-letter tag", () => {
    expect(languageName("jpn")).toBe("Japanese");
  });

  it("returns an unknown tag as it is", () => {
    expect(languageName("qaa")).toBe("qaa");
  });

  it("falls back to the code for an invalid tag", () => {
    expect(languageName("not a language")).toBe("not a language");
  });
});
