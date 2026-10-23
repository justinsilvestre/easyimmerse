import { describe, expect, it } from "vitest";
import { createI18nDetectLanguage } from "./i18nLanguageDetection.ts";

describe("createI18nDetectLanguage", () => {
  it("answers the likeliest language of a reliable detection", async () => {
    const detectLanguage = createI18nDetectLanguage(async () => ({
      isReliable: true,
      languages: [
        { language: "de", percentage: 90 },
        { language: "en", percentage: 10 },
      ],
    }));
    expect(await detectLanguage("Der Hund bellt.")).toBe("de");
  });

  it("answers null for an unreliable detection", async () => {
    const detectLanguage = createI18nDetectLanguage(async () => ({
      isReliable: false,
      languages: [{ language: "de", percentage: 40 }],
    }));
    expect(await detectLanguage("Hund")).toBeNull();
  });

  it("answers null when the detection fails", async () => {
    const detectLanguage = createI18nDetectLanguage(async () => {
      throw new Error("No detector.");
    });
    expect(await detectLanguage("Hund")).toBeNull();
  });
});
