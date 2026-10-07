import type { SubtitleDisplay } from "./SubtitleOverlay.tsx";

/** Which panels surround the media screen's stage, and which subtitles lie over it. */
export type MediaPanels = {
  cues: boolean;
  waveform: boolean;
  subtitleDisplay: SubtitleDisplay;
};

export type MediaPanelsAction =
  | { type: "cuePanelToggled" }
  | { type: "waveformToggled" }
  | { type: "subtitleDisplayCycled" };

/** The subtitles panel starts open and the waveform closed, since the waveform matters only when editing a flashcard's clip. */
export const initialMediaPanels: MediaPanels = {
  cues: true,
  waveform: false,
  subtitleDisplay: "both",
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
  }
}
