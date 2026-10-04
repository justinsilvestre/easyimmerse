import { describe, expect, it } from "vitest";
import { defaultProjectSettings } from "./defaultProjectSettings.ts";

describe("defaultProjectSettings", () => {
  it("targets German", () => {
    expect(defaultProjectSettings("en-US").target_language).toBe("de");
  });

  it("translates into the browser's language when it is offered", () => {
    expect(defaultProjectSettings("fr-CA").translation_language).toBe("fr");
  });

  it("translates into English when the browser's language is not offered", () => {
    expect(defaultProjectSettings("nl-NL").translation_language).toBe("en");
  });

  it("starts with the intermediate preset's fields", () => {
    expect(defaultProjectSettings("en").flashcard_fields).toEqual([
      "word",
      "l1_definition",
      "text_context",
      "text_context_translation",
      "audio_context",
      "screenshot",
      "tags",
    ]);
  });
});
