import { describe, expect, it } from "vitest";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";
import { createDefaultProjectSettings } from "./createDefaultProjectSettings.ts";

describe("createDefaultProjectSettings", () => {
  it("leaves the name and target language blank", () => {
    const { name, target_language } = createDefaultProjectSettings("en");
    expect({ name, target_language }).toEqual({
      name: "",
      target_language: "",
    });
  });

  it("uses the given translation language", () => {
    expect(createDefaultProjectSettings("fr").translation_language).toBe("fr");
  });

  it("starts from the intermediate preset", () => {
    expect(
      createDefaultProjectSettings("en").flashcard_settings.included_fields,
    ).toEqual(flashcardPresetFields.intermediate);
  });

  it("tags cards with the media name and has no other default tags", () => {
    const { default_tags, tag_with_media_name } =
      createDefaultProjectSettings("en").flashcard_settings;
    expect({ default_tags, tag_with_media_name }).toEqual({
      default_tags: [],
      tag_with_media_name: true,
    });
  });

  it("leaves text-to-speech off", () => {
    expect(
      createDefaultProjectSettings("en").flashcard_settings
        .use_tts_when_no_audio,
    ).toBe(false);
  });
});
