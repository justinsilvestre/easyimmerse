import type { MediaFile } from "@easyimmerse/types";

/**
 * Tells whether the server plays a media file: one on its disk, or one added from a browser whose copy the server keeps.
 * The server's copy plays even while the browser still holds the file, so that every part of the app reads the file from the same place.
 */
export function isPlayedByServer(mediaFile: MediaFile): boolean {
  return mediaFile.source.kind === "path" || mediaFile.has_stored_copy;
}
