import { skipToken, useGetMediaTracksQuery } from "@easyimmerse/backend";
import { selectPlayerDuration } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** The player's duration once it has loaded, else the probed duration, else zero. */
export function useMediaDurationMs(
  projectId: string,
  mediaFile: MediaFile | null,
): number {
  const playerDurationMs = useAppSelector(selectPlayerDuration) * 1000;
  const { data } = useGetMediaTracksQuery(
    mediaFile?.source.kind === "path"
      ? { projectId, mediaFileId: mediaFile.id }
      : skipToken,
  );
  if (playerDurationMs > 0) return playerDurationMs;
  return data?.container.duration_ms ?? 0;
}
