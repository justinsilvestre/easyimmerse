import {
  type FlashcardFieldKey,
  toggleField,
} from "../flashcards/flashcardFields.ts";
import {
  type FlashcardPreset,
  fieldsOfPreset,
} from "../flashcards/flashcardPresets.ts";

export type ProjectFormValues = {
  name: string;
  targetLanguage: string;
  translationLanguage: string;
  flashcardFields: readonly FlashcardFieldKey[];
  defaultTags: readonly string[];
  /** Whether each new flashcard is tagged with the name of the media file it was made from. */
  tagsMediaName: boolean;
  fillsAudioWithTts: boolean;
};

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
  state: ProjectFormValues,
  action: ProjectFormAction,
): ProjectFormValues {
  switch (action.type) {
    case "nameChanged":
      return { ...state, name: action.value };
    case "targetLanguageChanged":
      return { ...state, targetLanguage: action.value };
    case "translationLanguageChanged":
      return { ...state, translationLanguage: action.value };
    case "presetChosen":
      return { ...state, flashcardFields: fieldsOfPreset(action.preset) };
    case "fieldToggled":
      return {
        ...state,
        flashcardFields: toggleField(state.flashcardFields, action.key),
      };
    case "defaultTagsChanged":
      return { ...state, defaultTags: action.tags };
    case "mediaNameTagToggled":
      return { ...state, tagsMediaName: !state.tagsMediaName };
    case "ttsToggled":
      return { ...state, fillsAudioWithTts: !state.fillsAudioWithTts };
  }
}
