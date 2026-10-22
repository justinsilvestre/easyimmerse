import type {
  AudioTarget,
  PlaybackMethodRequest,
  VideoQuality,
} from "@easyimmerse/types";
import type { ReadableState } from "../../app/feature.ts";
import { updated } from "../../app/updated.ts";
import type { PreferencesState } from "../../preferences/preferencesState.ts";
import type { MediaRoute } from "../../route/route.ts";
import type { PathPlayback } from "./pathPlayback.ts";
import { playbackMethodRequest } from "./playbackRequests.ts";
import { selectPlayedMediaFile } from "./playedMediaFile.ts";

/** The preferences as far as a playback method request needs them: their values, and whether they have loaded. */
type MethodPreferences = Pick<PreferencesState, "values" | "isLoaded">;

/** Sends the first playback method request, unless one was sent or the first track choice is open. */
export function requestFirstPlaybackMethod(
  playback: PathPlayback | null,
  app: Pick<ReadableState, "route" | "screen" | "backend">,
  preferences: MethodPreferences,
) {
  const { dialog } = app.screen;
  const isChoosing =
    dialog?.kind === "trackChoice" && dialog.stage === "choosing";
  return playback?.methodRequest === null && !isChoosing
    ? requestPlaybackMethod(playback, selectPlayedMediaFile(app), preferences)
    : updated(playback);
}

const videoQualities = [
  "compact",
  "balanced",
  "best",
] as const satisfies readonly VideoQuality[];

/**
 * Sends the playback method request for the selection once the browser is measured, with the audio target and video quality of the first request,
 * or of the preferences, once loaded, for the first.
 */
export function requestPlaybackMethod(
  playback: PathPlayback | null,
  route: MediaRoute,
  preferences: MethodPreferences,
) {
  if (playback?.environment == null) return updated(playback);
  const sent = playback.methodRequest;
  if (sent === null && !preferences.isLoaded) return updated(playback);
  const request = {
    environment: playback.environment,
    selection: playback.selection,
    preferred_audio_target: audioTargetOf(sent, preferences),
    video_quality: videoQualityOf(sent, preferences),
  };
  return updated(
    { ...playback, methodRequest: request },
    playbackMethodRequest(route, request),
  );
}

/** The audio target of the request sent first, or for the first, the lossless-audio preference's. */
function audioTargetOf(
  sent: PlaybackMethodRequest | null,
  preferences: MethodPreferences,
): AudioTarget | null {
  if (sent !== null) return sent.preferred_audio_target;
  return preferences.values.losslessAudio === "true" ? "flac" : null;
}

/** The video quality of the request sent first, or for the first, the video quality preference's. */
function videoQualityOf(
  sent: PlaybackMethodRequest | null,
  preferences: MethodPreferences,
): VideoQuality | null {
  if (sent !== null) return sent.video_quality;
  const preferred = preferences.values.videoQuality;
  return videoQualities.find((quality) => quality === preferred) ?? null;
}
