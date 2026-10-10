import { skipToken, useGetMediaTracksQuery } from "@easyimmerse/backend";
import { selectPathPlayback, selectPlayerDuration } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useAppSelector } from "../hooks/useAppSelector.ts";

/** The player's duration once it has loaded, else the probed duration, else zero. */
export function useMediaDurationMs(
  projectId: string,
  mediaFile: MediaFile | null,
): number {
  const playerDurationMs = useAppSelector(selectPlayerDuration) * 1000;
  // The media screen's update asks for the tracks; the hook only reads them, once that request is sent.
  const isAsked = useAppSelector(selectPathPlayback) !== null;
  const { data } = useGetMediaTracksQuery(
    isAsked && mediaFile !== null
      ? { projectId, mediaFileId: mediaFile.id }
      : skipToken,
  );
  if (playerDurationMs > 0) return playerDurationMs;
  return data?.container.duration_ms ?? 0;
}
