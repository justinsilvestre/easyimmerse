import type { SubtitleTrack } from "@easyimmerse/types";

export const subtitleActions = {
  /** Tells that a track was added to the open media, so that its text is read when only the browser holds it. */
  subtitleTrackAdded: (track: SubtitleTrack) =>
    ({ type: "subtitleTrackAdded", track }) as const,
  subtitleOverlayToggled: () => ({ type: "subtitleOverlayToggled" }) as const,
  subtitlesPanelToggled: () => ({ type: "subtitlesPanelToggled" }) as const,
  subtitleTextLoaded: (trackId: string, text: string) =>
    ({ type: "subtitleTextLoaded", trackId, text }) as const,
  subtitleTextFailed: (trackId: string, message: string) =>
    ({ type: "subtitleTextFailed", trackId, message }) as const,
};
