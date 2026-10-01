import { useSetMediaDurationMutation } from "@easyimmerse/backend";
import { selectPlayer } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { useEffect, useRef } from "react";
import { useAppSelector } from "./useAppSelector.ts";

/** Saves the media's duration once the player knows it, when the project does not have it yet. */
export function useRecordMediaDuration(projectId: string, media: MediaFile) {
  const durationMs = useAppSelector((state) => selectPlayer(state).durationMs);
  const [setMediaDuration] = useSetMediaDurationMutation();
  const isRecorded = useRef(false);
  useEffect(() => {
    if (isRecorded.current || media.duration_ms !== null) return;
    if (durationMs === null) return;
    isRecorded.current = true;
    setMediaDuration({
      projectId,
      mediaId: media.id,
      duration_ms: Math.round(durationMs),
    });
  }, [durationMs, media, projectId, setMediaDuration]);
}
