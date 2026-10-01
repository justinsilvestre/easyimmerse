import {
  type BackendClient,
  type BackendRequest,
  buildMediaTracksRequest,
  buildPlaybackRequest,
  createHttpBackendClient,
  type ServerConfig,
} from "@easyimmerse/backend";
import type { Effects, MediaPlayback } from "@easyimmerse/state";
import type {
  MediaFile,
  MediaTracks,
  PlaybackResponse,
} from "@easyimmerse/types";
import { buildMediaStreamUrl } from "./buildMediaStreamUrl.ts";
import { findFrameDurationMs } from "./findFrameDurationMs.ts";
import {
  type BrowserMediaApis,
  measurePlaybackEnvironment,
} from "./measurePlaybackEnvironment.ts";
import { mediaPlaybackFromResponse } from "./mediaPlaybackFromResponse.ts";
import { readBrowserMediaApis } from "./readBrowserMediaApis.ts";

/**
 * Builds the effect that decides with the embedded server how the web view plays a media file on disk: directly, or as a stream that the server converts.
 * Rejects with a readable reason when the file cannot play, and for media stored in a browser.
 */
export function createResolveMediaPlayback(
  server: ServerConfig,
  client: BackendClient = createHttpBackendClient(server),
  readBrowser: () => BrowserMediaApis = readBrowserMediaApis,
): Effects["resolveMediaPlayback"] {
  return async (projectId, media) => {
    assertOnDisk(media);
    const tracks = await send<MediaTracks>(
      client,
      buildMediaTracksRequest(projectId, media.id),
    );
    const environment = measurePlaybackEnvironment(tracks, readBrowser());
    const response = await send<PlaybackResponse>(
      client,
      buildPlaybackRequest(projectId, media.id, { environment }),
    );
    const directUrl = buildMediaStreamUrl(server, projectId, media.id);
    const playback = mediaPlaybackFromResponse(response, server, directUrl);
    return withFrameDuration(playback, findFrameDurationMs(tracks));
  };
}

function assertOnDisk(media: MediaFile): void {
  if (media.source.kind !== "path")
    throw new Error(`${media.name} was added in a browser and is not here.`);
}

async function send<T>(
  client: BackendClient,
  request: BackendRequest,
): Promise<T> {
  const result = await client.send<T>(request);
  if ("error" in result) throw new Error(result.error.message);
  return result.data;
}

function withFrameDuration(
  playback: MediaPlayback,
  frameDurationMs: number | undefined,
): MediaPlayback {
  return frameDurationMs === undefined
    ? playback
    : { ...playback, frameDurationMs };
}
