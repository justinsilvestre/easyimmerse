import type { SaveProjectRequest } from "@easyimmerse/types";
import {
  type FlashcardFieldKey,
  toggleField,
} from "../flashcards/flashcardFields.ts";
import {
  type FlashcardPreset,
  fieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";

/** A project's name and settings as the form edits them. */
export type ProjectFormValues = SaveProjectRequest["settings"] & {
  name: string;
};

export type ProjectFormAction =
  | { type: "nameChanged"; value: string }
  | { type: "target_languageChanged"; value: string }
  | { type: "translation_languageChanged"; value: string }
  | { type: "presetChosen"; preset: FlashcardPreset }
  | { type: "fieldToggled"; key: FlashcardFieldKey }
  | { type: "default_tagsChanged"; tags: readonly string[] }
  | { type: "mediaNameTagToggled" }
  | { type: "ttsToggled" };

export function reduceProjectForm(
  state: ProjectFormValues,
  action: ProjectFormAction,
): ProjectFormValues {
  switch (action.type) {
    case "nameChanged":
      return { ...state, name: action.value };
    case "target_languageChanged":
      return { ...state, target_language: action.value };
    case "translation_languageChanged":
      return { ...state, translation_language: action.value };
    case "presetChosen":
      return {
        ...state,
        flashcard_fields: [...fieldsOfPreset(action.preset)],
      };
    case "fieldToggled":
      return {
        ...state,
        flashcard_fields: [...toggleField(state.flashcard_fields, action.key)],
      };
    case "default_tagsChanged":
      return { ...state, default_tags: [...action.tags] };
    case "mediaNameTagToggled":
      return { ...state, tags_media_name: !state.tags_media_name };
    case "ttsToggled":
      return { ...state, fills_audio_with_tts: !state.fills_audio_with_tts };
  }
}
