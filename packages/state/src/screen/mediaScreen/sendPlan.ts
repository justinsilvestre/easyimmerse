import type { AudioTarget, PlaybackRequest } from "@easyimmerse/types";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import type { PreferencesState } from "../../preferences/preferencesState.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { planRequest } from "./playbackRequests.ts";
import { shownMediaFile } from "./shownMediaScreen.ts";

/** The preferences as far as a plan needs them: their values, and whether they have loaded. */
type PlanPreferences = Pick<PreferencesState, "values" | "isLoaded">;

/** Sends the first plan, unless one was sent or the first track choice is open. */
export function sendFirstPlan(
  playback: PathPlayback | null,
  app: Pick<AppState, "route" | "screen">,
  preferences: PlanPreferences,
) {
  const { dialog } = app.screen;
  const isChoosing =
    dialog?.kind === "trackChoice" && dialog.stage === "choosing";
  return playback?.planRequest === null && !isChoosing
    ? sendPlan(playback, shownMediaFile(app), preferences)
    : updated(playback);
}

/**
 * Sends the plan for the playback's selection once the browser is measured, with the audio target of the first plan,
 * or of the preference, once loaded, for the first.
 */
export function sendPlan(
  playback: PathPlayback | null,
  route: MediaRoute,
  preferences: PlanPreferences,
) {
  if (playback?.environment == null) return updated(playback);
  const sent = playback.planRequest;
  if (sent === null && !preferences.isLoaded) return updated(playback);
  const request = {
    environment: playback.environment,
    selection: playback.selection,
    preferred_audio_target: audioTargetOf(sent, preferences),
  };
  return updated(
    { ...playback, planRequest: request },
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
