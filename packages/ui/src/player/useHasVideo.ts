import { skipToken, useGetMediaTracksQuery } from "@easyimmerse/backend";
import type { MediaFile } from "@easyimmerse/types";
import { isAudioFileName } from "./isAudioFileName.ts";

/**
 * Whether the media file shows pictures: probed by the server for a file on its disk,
 * and guessed from the name for a file the browser holds.
 */
export function useHasVideo(
  projectId: string,
  mediaFile: MediaFile | null,
): boolean {
  const { data } = useGetMediaTracksQuery(
    mediaFile?.source.kind === "path"
      ? { projectId, mediaFileId: mediaFile.id }
      : skipToken,
  );
  if (mediaFile === null) return false;
  if (mediaFile.source.kind !== "path") return !isAudioFileName(mediaFile.name);
  return (
    data?.container.tracks.some((track) => track.kind === "video") ?? false
  );
}
