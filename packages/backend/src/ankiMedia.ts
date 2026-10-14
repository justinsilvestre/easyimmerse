import type { AnkiMediaRef } from "@easyimmerse/types";
import type { ServerFetch } from "./serverFetch.ts";

/** Fetches the bytes of a note's audio clip or screenshot from the server, or resolves null when the server cannot render it. */
export type MediaFetch = (
  projectId: string,
  media: AnkiMediaRef,
) => Promise<Uint8Array | null>;

/** Builds a media fetch over the server, or one that finds nothing when the app has no server. */
export function createMediaFetch(serverFetch: ServerFetch | null): MediaFetch {
  return async (projectId, media) => {
    if (serverFetch === null) return null;
    const response = await serverFetch(mediaPath(projectId, media)).catch(
      () => null,
    );
    if (!response?.ok) return null;
    return new Uint8Array(await response.arrayBuffer());
  };
}

/** The server's path of an audio clip or a screenshot of a media file, with the times it is cut at. */
export function mediaPath(projectId: string, media: AnkiMediaRef): string {
  const file = `/projects/${encodeURIComponent(projectId)}/media/${encodeURIComponent(media.media_file_id)}`;
  const query =
    media.kind === "audio"
      ? new URLSearchParams({
          start_ms: String(media.start_ms),
          end_ms: String(media.end_ms),
        })
      : new URLSearchParams({ at_ms: String(media.at_ms) });
  const route = media.kind === "audio" ? "clip" : "frame";
  return `${file}/${route}?${query}`;
}
