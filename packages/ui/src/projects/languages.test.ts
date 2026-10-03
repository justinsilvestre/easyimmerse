import { describe, expect, it } from "vitest";
import { languageName } from "./languages.ts";

describe("languageName", () => {
  it("names a known language in English", () => {
    expect(languageName("de")).toBe("German");
  });

  it("falls back to the code for an invalid tag", () => {
    expect(languageName("not a language")).toBe("not a language");
  });
});
