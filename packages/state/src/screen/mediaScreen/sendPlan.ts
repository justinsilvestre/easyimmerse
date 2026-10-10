import type { AudioTarget, PlaybackRequest } from "@easyimmerse/types";
import { updated } from "../../app/updated.ts";
import type { PreferencesState } from "../../preferences/preferencesState.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { MediaScreenState, ScreenState } from "../screenState.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { planRequest } from "./playbackRequests.ts";

/** The preferences as far as a plan needs them: their values, and whether they have loaded. */
type PlanPreferences = Pick<PreferencesState, "values" | "isLoaded">;

/** Sends the first plan, unless one was sent or the first track choice is open. */
export function sendFirstPlan(
  screen: MediaScreenState,
  route: MediaRoute,
  dialog: ScreenState["dialog"],
  preferences: PlanPreferences,
) {
  const isChoosing =
    dialog?.kind === "trackChoice" && dialog.stage === "choosing";
  return screen.playback?.planRequest === null && !isChoosing
    ? sendPlan(screen, route, preferences)
    : updated(screen);
}

/**
 * Sends the plan for the playback's selection once the browser is measured, with the audio target of the first plan,
 * or of the preference, once loaded, for the first.
 */
export function sendPlan(
  screen: MediaScreenState,
  route: MediaRoute,
  preferences: PlanPreferences,
) {
  const { playback } = screen;
  if (playback?.environment == null) return updated(screen);
  const sent = playback.planRequest;
  if (sent === null && !preferences.isLoaded) return updated(screen);
  const request = {
    environment: playback.environment,
    selection: playback.selection,
    preferred_audio_target: audioTargetOf(sent, preferences),
  };
  return updated(
    withPlayback(screen, playback, { planRequest: request }),
    planRequest(route, request),
  );
}

/** The audio target of the plan sent first, or for the first, the lossless-audio preference's. */
function audioTargetOf(
  sent: PlaybackRequest | null,
  preferences: PlanPreferences,
): AudioTarget | null {
  if (sent !== null) return sent.preferred_audio_target;
  return preferences.values.losslessAudio === "true" ? "flac" : null;
}

/** Returns the screen with some of its playback's fields replaced. */
export function withPlayback(
  screen: MediaScreenState,
  playback: PathPlayback,
  changes: Partial<PathPlayback>,
): MediaScreenState {
  return { ...screen, playback: { ...playback, ...changes } };
}
