import type {
  FlashcardPreset,
  FlashcardSettings,
  ProjectSettings,
} from "@easyimmerse/types";
import { flashcardPresetFields } from "../flashcardPresetFields.ts";

type ProjectSettingsAction =
  | {
      type: "projectChanged";
      changes: Partial<Omit<ProjectSettings, "flashcard_settings">>;
    }
  | { type: "flashcardSettingsChanged"; changes: Partial<FlashcardSettings> }
  | { type: "presetChosen"; preset: FlashcardPreset };

/** Applies one edit from the project settings form. */
export function projectSettingsReducer(
  settings: ProjectSettings,
  action: ProjectSettingsAction,
): ProjectSettings {
  switch (action.type) {
    case "projectChanged":
      return { ...settings, ...action.changes };
    case "flashcardSettingsChanged":
      return changeFlashcardSettings(settings, action.changes);
    case "presetChosen":
      return changeFlashcardSettings(settings, {
        included_fields: [...flashcardPresetFields[action.preset]],
      });
  }
}

function changeFlashcardSettings(
  settings: ProjectSettings,
  changes: Partial<FlashcardSettings>,
): ProjectSettings {
  return {
    ...settings,
    flashcard_settings: { ...settings.flashcard_settings, ...changes },
  };
}
