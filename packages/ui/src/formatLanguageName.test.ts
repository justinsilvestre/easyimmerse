import { describe, expect, it } from "vitest";
import { formatLanguageName } from "./formatLanguageName.ts";

describe("formatLanguageName", () => {
  it("names a language in the given locale", () => {
    expect(formatLanguageName("de", "en")).toBe("German");
  });

  it("names a regional variant", () => {
    expect(formatLanguageName("pt-BR", "en")).toBe("Brazilian Portuguese");
  });

  it("writes the name in the locale's own language", () => {
    expect(formatLanguageName("ja", "de")).toBe("Japanisch");
  });

  it("returns the tag unchanged when it is not a valid language tag", () => {
    expect(formatLanguageName("not a tag", "en")).toBe("not a tag");
  });
});
