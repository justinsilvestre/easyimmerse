import type { PlaybackMethodResponse } from "@easyimmerse/types";
import type { PreferencesState } from "../../preferences/preferencesState.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { copiesChosenTracksOnly } from "./playbackMethodRules.ts";

/**
 * Tells whether the conversion notice must be accepted before the playback method's stream loads:
 * the method re-encodes a track into a playlist, and the user has not settled the notice by accepting or dismissing it.
 */
export function isConversionNoticeDue(
  response: PlaybackMethodResponse,
  isSettled: boolean,
): boolean {
  return (
    response.method.kind === "convert" &&
    response.playlist_path !== null &&
    !copiesChosenTracksOnly(response.method) &&
    !isSettled
  );
}

/** Tells whether the user has settled the conversion notice: dismissed it for good, or accepted it for the open file. */
export function isNoticeSettled(
  playback: PathPlayback,
  preferences: PreferencesState,
): boolean {
  return (
    preferences.values.conversionNoticeDismissed === "true" ||
    playback.isConversionAccepted
  );
}
