import type { ProjectSettings } from "@easyimmerse/types";
import { fieldsOfPreset } from "../flashcards/flashcardPresets.ts";
import { languageOptions } from "./languages.ts";

const defaultTargetLanguage = "de";
const fallbackTranslationLanguage = "en";

/**
 * The settings a first project starts with. Translations are in the browser's language
 * when the form offers it, and in English otherwise.
 */
export function defaultProjectSettings(
  browserLanguage: string,
): ProjectSettings {
  return {
    target_language: defaultTargetLanguage,
    translation_language: translationLanguageFor(browserLanguage),
    flashcard_fields: [...fieldsOfPreset("intermediate")],
    default_tags: [],
    tags_media_name: true,
    fills_audio_with_tts: false,
  };
}

/** The offered language matching the primary subtag of a BCP 47 code such as `fr-CA`, or English. */
function translationLanguageFor(browserLanguage: string): string {
  const primary = browserLanguage.split("-")[0]?.toLowerCase();
  const offered = languageOptions.some((option) => option.value === primary);
  return offered && primary ? primary : fallbackTranslationLanguage;
}
