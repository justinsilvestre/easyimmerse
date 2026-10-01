import type { ServerConfig } from "@easyimmerse/backend";
import type { Effects } from "@easyimmerse/state";
import { buildMediaStreamUrl } from "./buildMediaStreamUrl.ts";

/** Builds the effect that has the player load media files on disk directly from the embedded server. Rejects for media stored in a browser. */
export function createResolveMediaPlayback(
  server: ServerConfig,
): Effects["resolveMediaPlayback"] {
  return async (projectId, media) => {
    if (media.source.kind !== "path")
      throw new Error(`${media.name} was added in a browser and is not here.`);
    const url = buildMediaStreamUrl(server, projectId, media.id);
    return { kind: "direct", url };
  };
}

/** Rejects always, since the native app never stores files the way a browser does. */
export async function readStoredFileText(): Promise<string> {
  throw new Error("The native app has no files stored in a browser.");
}

/** Rejects always, since the native app never stores files the way a browser does. */
export async function readStoredFileBytes(): Promise<Uint8Array> {
  throw new Error("The native app has no files stored in a browser.");
}
