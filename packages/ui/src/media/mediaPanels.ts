import type { SubtitleDisplay } from "./SubtitleOverlay.tsx";

/** Which panels surround the media screen's stage, and which subtitles lie over it. */
export type MediaPanels = {
  cues: boolean;
  waveform: boolean;
  distractionFree: boolean;
  subtitleDisplay: SubtitleDisplay;
};

export type MediaPanelsAction =
  | { type: "cuePanelToggled" }
  | { type: "waveformToggled" }
  | { type: "distractionFreeToggled" }
  | { type: "subtitleDisplayCycled" };

export const initialMediaPanels: MediaPanels = {
  cues: true,
  waveform: true,
  distractionFree: false,
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
    case "distractionFreeToggled":
      return { ...panels, distractionFree: !panels.distractionFree };
    case "subtitleDisplayCycled":
      return {
        ...panels,
        subtitleDisplay: nextDisplay[panels.subtitleDisplay],
      };
  }
}
