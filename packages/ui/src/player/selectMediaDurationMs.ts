import { selectCachedMediaTracks } from "@easyimmerse/backend";
import type { RootState } from "@easyimmerse/state";
import {
  mainScreenOf,
  selectPlayerDuration,
  selectRoute,
} from "@easyimmerse/state";

/** Returns the open media file's length: the player's once it has loaded the file, else the probed one, else zero. */
export function selectMediaDurationMs(state: RootState): number {
  const playerDurationMs = selectPlayerDuration(state) * 1000;
  if (playerDurationMs > 0) return playerDurationMs;
  const route = mainScreenOf(selectRoute(state));
  if (route.screen !== "media") return 0;
  const { projectId, mediaFileId } = route;
  const tracks = selectCachedMediaTracks(state, { projectId, mediaFileId });
  return tracks?.container.duration_ms ?? 0;
}
