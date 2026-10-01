import type { PlaybackRequest } from "@easyimmerse/types";
import type { BackendRequest } from "./backendClient.ts";

/** Builds the request for a media file's tracks and the MIME type a browser checks before playing it directly. */
export function buildMediaTracksRequest(
  projectId: string,
  mediaId: string,
): BackendRequest {
  return { method: "GET", path: `${mediaPath(projectId, mediaId)}/tracks` };
}

/** Builds the request that asks the server how the measured browser will play a media file. */
export function buildPlaybackRequest(
  projectId: string,
  mediaId: string,
  body: PlaybackRequest,
): BackendRequest {
  return {
    method: "POST",
    path: `${mediaPath(projectId, mediaId)}/playback`,
    body: { kind: "json", value: body },
  };
}

function mediaPath(projectId: string, mediaId: string): string {
  return `/projects/${projectId}/media/${mediaId}`;
}
