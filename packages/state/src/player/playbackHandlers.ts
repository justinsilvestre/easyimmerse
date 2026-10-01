import type { AppState } from "../appState.ts";
import type { UpdateHandlers, UpdateResult } from "../updateHandlers.ts";
import type { MediaPlayback } from "./mediaPlayback.ts";
import { withPlayer } from "./withPlayer.ts";

export const playbackHandlers = {
  mediaPlaybackResolved: (state, { mediaId, playback }) => [
    isMediaOpen(state, mediaId) ? receivePlayback(state, playback) : state,
    [],
  ],
  mediaPlaybackFailed: (state, { mediaId, message }) => [
    isMediaOpen(state, mediaId)
      ? withPlayer(state, { playback: null, playbackError: message })
      : state,
    [],
  ],
  conversionNoticeConfirmed: (state, { dontShowAgain }) => {
    const { heldPlayback } = state.player;
    if (heldPlayback === null) return [state, []];
    const started = withPlayer(state, {
      playback: heldPlayback,
      heldPlayback: null,
    });
    return dontShowAgain ? dismissConversionNotice(started) : [started, []];
  },
} satisfies Partial<UpdateHandlers>;

/** Gives the playback to the player, or holds a converted one until the user confirms the conversion notice. */
function receivePlayback(state: AppState, playback: MediaPlayback): AppState {
  const isHeld =
    playback.kind === "hls" &&
    state.preferences.conversionNoticeDismissed !== "true";
  return withPlayer(state, {
    playback: isHeld ? null : playback,
    heldPlayback: isHeld ? playback : null,
    playbackError: null,
  });
}

function dismissConversionNotice(state: AppState): UpdateResult {
  const key = "conversionNoticeDismissed";
  return [
    { ...state, preferences: { ...state.preferences, [key]: "true" } },
    [{ type: "savePreference", key, value: "true" }],
  ];
}

/** Tells whether the media is still open, so that a late result for other media is ignored. */
function isMediaOpen(state: AppState, mediaId: string): boolean {
  return state.screen.kind === "media" && state.screen.mediaId === mediaId;
}
