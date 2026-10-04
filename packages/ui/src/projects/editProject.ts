import type { FlashcardFieldKey, ProjectSettings } from "@easyimmerse/types";
import { toggleField } from "../flashcards/flashcardFields.ts";
import {
  type FlashcardPreset,
  fieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";

export type ProjectFormAction =
  | { type: "nameChanged"; value: string }
  | { type: "targetLanguageChanged"; value: string }
  | { type: "translationLanguageChanged"; value: string }
  | { type: "presetChosen"; preset: FlashcardPreset }
  | { type: "fieldToggled"; key: FlashcardFieldKey }
  | { type: "defaultTagsChanged"; tags: readonly string[] }
  | { type: "mediaNameTagToggled" }
  | { type: "ttsToggled" };

export function reduceProjectForm(
  state: ProjectSettings,
  action: ProjectFormAction,
): ProjectSettings {
  switch (action.type) {
    case "nameChanged":
      return { ...state, name: action.value };
    case "targetLanguageChanged":
      return { ...state, target_language: action.value };
    case "translationLanguageChanged":
      return { ...state, translation_language: action.value };
    case "presetChosen":
      return { ...state, flashcard_fields: fieldsOfPreset(action.preset) };
    case "fieldToggled":
      return {
        ...state,
        flashcard_fields: toggleField(state.flashcard_fields, action.key),
      };
    case "defaultTagsChanged":
      return { ...state, default_tags: [...action.tags] };
    case "mediaNameTagToggled":
      return { ...state, tags_media_name: !state.tags_media_name };
    case "ttsToggled":
      return { ...state, fills_audio_with_tts: !state.fills_audio_with_tts };
  }
}
