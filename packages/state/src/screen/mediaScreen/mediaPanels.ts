import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import { formOf } from "../../flashcards/flashcardsOnScreen.ts";

/** Which subtitles lie over the media screen's stage: both languages, or one of them alone. */
export type SubtitleDisplay = "both" | "target" | "translation";

/** Which panels surround the media screen's stage, and which subtitles lie over it. */
export type MediaPanels = {
  cues: boolean;
  waveform: boolean;
  subtitleDisplay: SubtitleDisplay;
  /** Hides the subtitles over the stage, whichever of them `subtitleDisplay` picks. */
  areSubtitlesHidden: boolean;
};

/** The subtitles panel starts open and the waveform closed, since the waveform matters only when editing a flashcard's clip. */
export const initialMediaPanels: MediaPanels = {
  cues: true,
  waveform: false,
  subtitleDisplay: "both",
  areSubtitlesHidden: false,
};

const nextDisplay: Record<SubtitleDisplay, SubtitleDisplay> = {
  both: "target",
  target: "translation",
  translation: "both",
};

/**
 * Opens and closes the panels around the media screen's stage, and cycles and hides the subtitles over it.
 * The flashcard form takes the side panel while a card is open, so the subtitles panel cannot be toggled meanwhile.
 * `app` is the state before the action.
 */
export function updateMediaPanels(
  panels: MediaPanels,
  action: AppAction,
  app: AppState,
) {
  return updated(nextPanels(panels, action, app));
}

function nextPanels(
  panels: MediaPanels,
  action: AppAction,
  app: AppState,
): MediaPanels {
  switch (action.type) {
    case "cuePanelToggled":
      return formOf(app) === null ? { ...panels, cues: !panels.cues } : panels;
    case "waveformToggled":
      return { ...panels, waveform: !panels.waveform };
    case "subtitleDisplayCycled":
      return {
        ...panels,
        subtitleDisplay: nextDisplay[panels.subtitleDisplay],
      };
    case "subtitlesToggled":
      return { ...panels, areSubtitlesHidden: !panels.areSubtitlesHidden };
    default:
      return panels;
  }
}
