import type { Cue } from "@easyimmerse/types";
import { type AppAction, actions } from "../../app/appAction.ts";
import { dispatch } from "../../app/dispatchEffect.ts";
import type { ReadableState } from "../../app/feature.ts";
import type { MediaRoute } from "../../route/route.ts";
import { cacheEntry, type ServerCacheSlice } from "../../server/cacheEntry.ts";
import { mediaDurationMs } from "./mediaDurationMs.ts";
import { selectMediaScreen } from "./mediaScreenSelectors.ts";
import { replayTarget, skipTarget } from "./skipTarget.ts";

type CueSeekApp = Pick<ReadableState, "route" | "screen" | "backend">;

const noCues: readonly Cue[] = [];

/**
 * Returns the seek that a skip between cues or a replay of the cue shown now asks for on the open media screen,
 * as `skipTarget` and `replayTarget` describe. The cues are those of the target-language track chosen for the open file,
 * read from the server cache; while it holds none, the seek goes a few seconds either way.
 */
export function cueSeekCommands(action: AppAction, app: CueSeekApp) {
  if (
    action.type !== "cueSkipRequested" &&
    action.type !== "cueReplayRequested"
  )
    return [];
  const open = selectMediaScreen(app);
  if (open === null) return [];
  const cues = cachedTargetCues(app.backend, open.route);
  const currentMs = open.screen.playing.player.currentTimeSeconds * 1000;
  const targetMs =
    action.type === "cueSkipRequested"
      ? skipTarget(cues, currentMs, mediaDurationMs(app), action.direction)
      : replayTarget(cues, currentMs);
  return [dispatch(actions.seekRequested(targetMs / 1000))];
}

/** Returns the cues of the target-language track chosen for a media file, or none while the cache lacks the track or its cues. */
function cachedTargetCues(
  backend: ServerCacheSlice,
  file: MediaRoute,
): readonly Cue[] {
  const { projectId, mediaFileId } = file;
  const tracks = cacheEntry(backend, "listSubtitleTracks", {
    projectId,
    mediaFileId,
  });
  const trackId = tracks?.data?.selection.target_track_id ?? null;
  if (trackId === null) return noCues;
  const track = cacheEntry(backend, "getSubtitleCues", {
    projectId,
    mediaFileId,
    trackId,
  });
  return track?.data?.cues ?? noCues;
}
