import type { RootState } from "./createAppStore.ts";
import { hasScreenshotField } from "./flashcardEditor/hasScreenshotField.ts";
import type { PreferenceKey } from "./preferences/preferenceKey.ts";

export const selectScreen = (state: RootState) => state.app.screen;

export const selectPlayer = (state: RootState) => state.app.player;

export const selectCurrentTimeMs = (state: RootState) =>
  state.app.player.currentTimeMs;

export const selectSubtitles = (state: RootState) => state.app.subtitles;

export const selectLookup = (state: RootState) => state.app.lookup;

export const selectFlashcardEditor = (state: RootState) =>
  state.app.flashcardEditor;

/** Tells whether the card being edited has a screenshot field. False while the editor is closed. */
export const selectHasScreenshotField = (state: RootState) => {
  const editor = state.app.flashcardEditor;
  return editor.kind === "editing" && hasScreenshotField(editor.card);
};

export const selectPendingFilePick = (state: RootState) =>
  state.app.pendingFilePick;

export const selectChosenFile = (state: RootState) => state.app.chosenFile;

export const selectPreference = (key: PreferenceKey) => (state: RootState) =>
  state.app.preferences[key];
