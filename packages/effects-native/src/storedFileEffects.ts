import type { ServerConfig } from "@easyimmerse/backend";
import type { Effects } from "@easyimmerse/state";
import { buildMediaStreamUrl } from "./buildMediaStreamUrl.ts";

/** Builds the effect that has the embedded server stream media files on disk. Rejects for media stored in a browser. */
export function createResolveMediaUrl(
  server: ServerConfig,
): Effects["resolveMediaUrl"] {
  return async (projectId, media) => {
    if (media.source.kind !== "path")
      throw new Error(`${media.name} was added in a browser and is not here.`);
    return buildMediaStreamUrl(server, projectId, media.id);
  };
}

/** Rejects always, since the native app never stores files the way a browser does. */
export async function readStoredFileText(): Promise<string> {
  throw new Error("The native app has no files stored in a browser.");
}
