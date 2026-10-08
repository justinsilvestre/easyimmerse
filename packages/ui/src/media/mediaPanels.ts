import type { SubtitleDisplay } from "./SubtitleOverlay.tsx";

/** Which panels surround the media screen's stage, which subtitles lie over it, and whether the subtitle appearance dialog is open. */
export type MediaPanels = {
  cues: boolean;
  waveform: boolean;
  subtitleDisplay: SubtitleDisplay;
  /** Hides the subtitles over the stage, whichever of them `subtitleDisplay` picks. */
  areSubtitlesHidden: boolean;
  isSubtitleAppearanceOpen: boolean;
};

export type MediaPanelsAction =
  | { type: "cuePanelToggled" }
  | { type: "waveformToggled" }
  | { type: "subtitleDisplayCycled" }
  | { type: "subtitlesToggled" }
  | { type: "subtitleAppearanceOpened" }
  | { type: "subtitleAppearanceClosed" };

/** The subtitles panel starts open and the waveform closed, since the waveform matters only when editing a flashcard's clip. */
export const initialMediaPanels: MediaPanels = {
  cues: true,
  waveform: false,
  subtitleDisplay: "both",
  areSubtitlesHidden: false,
  isSubtitleAppearanceOpen: false,
};

const nextDisplay: Record<SubtitleDisplay, SubtitleDisplay> = {
  both: "target",
  target: "translation",
  translation: "both",
};

export function reduceMediaPanels(
  panels: MediaPanels,
  action: MediaPanelsAction,
): MediaPanels {
  switch (action.type) {
    case "cuePanelToggled":
      return { ...panels, cues: !panels.cues };
    case "waveformToggled":
      return { ...panels, waveform: !panels.waveform };
    case "subtitleDisplayCycled":
      return {
        ...panels,
        subtitleDisplay: nextDisplay[panels.subtitleDisplay],
      };
    case "subtitlesToggled":
      return { ...panels, areSubtitlesHidden: !panels.areSubtitlesHidden };
    case "subtitleAppearanceOpened":
      return { ...panels, isSubtitleAppearanceOpen: true };
    case "subtitleAppearanceClosed":
      return { ...panels, isSubtitleAppearanceOpen: false };
  }
}
