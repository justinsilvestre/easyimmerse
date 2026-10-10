import type {
  PlaybackRequest,
  TrackSelection,
  TracksResponse,
} from "@easyimmerse/types";
import type { Effect } from "../../app/effect.ts";
import type { MediaRoute } from "../../route/route.ts";
import { containerCodecStrings } from "./playbackPlanRules.ts";

/** The ids of the media screen's playback requests. Sending one again under its id aborts the one still running. */
export const playbackRequestIds = (mediaFileId: string) => ({
  mediaFile: `media/${mediaFileId}/mediaFile`,
  tracks: `media/${mediaFileId}/tracks`,
  plan: `media/${mediaFileId}/playbackPlan`,
  saveSelection: `media/${mediaFileId}/saveTrackSelection`,
});

/** Asks for the project's media files, which hold the open file's record. */
export function mediaFileRequest({ projectId, mediaFileId }: MediaRoute) {
  return {
    type: "sendRequest",
    id: playbackRequestIds(mediaFileId).mediaFile,
    request: { kind: "listMediaFiles", projectId },
  } satisfies Effect;
}

/** Asks for the tracks of the open file. */
export function tracksRequest({ projectId, mediaFileId }: MediaRoute) {
  return {
    type: "sendRequest",
    id: playbackRequestIds(mediaFileId).tracks,
    request: { kind: "getMediaTracks", projectId, mediaFileId },
  } satisfies Effect;
}

/** Asks for the plan of the open file. */
export function planRequest(
  { projectId, mediaFileId }: MediaRoute,
  request: PlaybackRequest,
) {
  return {
    type: "sendRequest",
    id: playbackRequestIds(mediaFileId).plan,
    request: { kind: "planPlayback", projectId, mediaFileId, request },
  } satisfies Effect;
}

/** Saves the track choice of the open file. */
export function saveSelectionRequest(
  { projectId, mediaFileId }: MediaRoute,
  selection: TrackSelection,
) {
  return {
    type: "sendRequest",
    id: playbackRequestIds(mediaFileId).saveSelection,
    request: { kind: "saveTrackSelection", projectId, mediaFileId, selection },
  } satisfies Effect;
}

/** Measures the browser's support for the formats of the open file's tracks. */
export function measureRequest(
  { mediaFileId }: MediaRoute,
  tracks: TracksResponse,
) {
  return {
    type: "measurePlaybackEnvironment",
    mediaFileId,
    directMimeType: tracks.direct_mime_type,
    codecStrings: containerCodecStrings(tracks.container),
  } satisfies Effect;
}
