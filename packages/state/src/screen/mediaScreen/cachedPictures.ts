import type { MediaFile } from "@easyimmerse/types";
import { cacheEntry, type ServerCacheSlice } from "../../server/cacheEntry.ts";
import type { ServerConfig } from "../../server/serverState.ts";
import { isPlayedByServer } from "../isPlayedByServer.ts";
import { isAudioFileName } from "../mediaFileExtensions.ts";

/**
 * Tells whether a media file is known to show pictures, which a flashcard made from it takes a screenshot of:
 * for a file the server plays, the server found a video track among its tracks;
 * for a file only the browser holds, whose name is not that of a sound file, the browser's probe found pictures.
 * False while neither answer is in the server cache.
 */
export function cachedHasPictures(
  backend: ServerCacheSlice,
  server: ServerConfig | null,
  mediaFile: MediaFile,
): boolean {
  const { source } = mediaFile;
  if (isPlayedByServer(mediaFile)) {
    if (server === null) return false;
    const file = { projectId: mediaFile.project_id, mediaFileId: mediaFile.id };
    const tracks = cacheEntry(backend, "getMediaTracks", file)?.data;
    return (
      tracks?.container.tracks.some(({ kind }) => kind === "video") ?? false
    );
  }
  if (source.kind !== "browser_file" || isAudioFileName(mediaFile.name))
    return false;
  const picked = { name: mediaFile.name, source };
  return cacheEntry(backend, "probePictures", picked)?.data === true;
}
