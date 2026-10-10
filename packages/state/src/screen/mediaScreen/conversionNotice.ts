import type { PlaybackResponse } from "@easyimmerse/types";
import { copiesChosenTracksOnly } from "./playbackPlanRules.ts";

/**
 * Tells whether the conversion notice must be accepted before the plan's stream loads:
 * the plan re-encodes a track into a playlist, and the user has not settled the notice by accepting or dismissing it.
 */
export function isConversionNoticeDue(
  response: PlaybackResponse,
  isSettled: boolean,
): boolean {
  return (
    response.plan.kind === "convert" &&
    response.playlist_path !== null &&
    !copiesChosenTracksOnly(response.plan) &&
    !isSettled
  );
}
