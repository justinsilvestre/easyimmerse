import type { ProjectSettings } from "@easyimmerse/types";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";

/** Returns the settings a new project starts with when there is no earlier project to copy. */
export function createDefaultProjectSettings(
  translationLanguage: string,
): ProjectSettings {
  return {
    name: "",
    target_language: "",
    translation_language: translationLanguage,
    flashcard_settings: {
      included_fields: [...flashcardPresetFields.intermediate],
      default_tags: [],
      tag_with_media_name: true,
      use_tts_when_no_audio: false,
    },
  };
}
