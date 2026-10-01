import type { AppState } from "../appState.ts";
import type { UpdateHandlers } from "../updateHandlers.ts";
import { readStoredSubtitleText } from "./readStoredSubtitleTexts.ts";
import type { SubtitlesState } from "./subtitlesState.ts";

export const subtitleHandlers = {
  subtitleTrackAdded: (state, { track }) => [
    state,
    readStoredSubtitleText(track),
  ],
  subtitleOverlayToggled: (state) => [
    withSubtitles(state, {
      overlay: state.subtitles.overlay === "target" ? "translation" : "target",
    }),
    [],
  ],
  subtitlesPanelToggled: (state) => [
    withSubtitles(state, { panelOpen: !state.subtitles.panelOpen }),
    [],
  ],
  subtitleTextLoaded: (state, { trackId, text }) => [
    withSubtitles(state, {
      browserFileTexts: {
        ...state.subtitles.browserFileTexts,
        [trackId]: text,
      },
    }),
    [],
  ],
  subtitleTextFailed: (state, { message }) => [
    state,
    [
      {
        type: "showNotification",
        message: `Could not read a subtitle file: ${message}`,
      },
    ],
  ],
} satisfies Partial<UpdateHandlers>;

function withSubtitles(
  state: AppState,
  changes: Partial<SubtitlesState>,
): AppState {
  return { ...state, subtitles: { ...state.subtitles, ...changes } };
}
