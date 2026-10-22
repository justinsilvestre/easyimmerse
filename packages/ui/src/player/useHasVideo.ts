import { skipToken, useGetMediaTracksQuery } from "@easyimmerse/backend";
import { isAudioFileName, isPlayedByServer } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";

/**
 * Whether the media file shows pictures: probed by the server for a file it plays,
 * and guessed from the name for a file only the browser holds.
 */
export function useHasVideo(
  projectId: string,
  mediaFile: MediaFile | null,
): boolean {
  const { data } = useGetMediaTracksQuery(
    mediaFile !== null && isPlayedByServer(mediaFile)
      ? { projectId, mediaFileId: mediaFile.id }
      : skipToken,
  );
  if (mediaFile === null) return false;
  if (!isPlayedByServer(mediaFile)) return !isAudioFileName(mediaFile.name);
  return (
    data?.container.tracks.some((track) => track.kind === "video") ?? false
  );
}
