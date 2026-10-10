import { selectCachedMediaTracks } from "@easyimmerse/backend";
import type { RootState } from "@easyimmerse/state";
import {
  mainScreenOf,
  needsTrackChoice,
  selectRoute,
} from "@easyimmerse/state";

/** Tells whether the open media file has several tracks of a kind to choose among, once its tracks are in the cache. */
export function selectCanChooseTracks(state: RootState): boolean {
  const route = mainScreenOf(selectRoute(state));
  if (route.screen !== "media") return false;
  const { projectId, mediaFileId } = route;
  const tracks = selectCachedMediaTracks(state, { projectId, mediaFileId });
  return tracks !== undefined && needsTrackChoice(tracks.container, null);
}
