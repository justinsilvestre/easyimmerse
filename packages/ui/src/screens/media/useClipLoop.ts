import { actions } from "@easyimmerse/state";
import type { AudioClip } from "@easyimmerse/types";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";

/** How far playback moves between two time updates at most; a larger jump is a seek, which is left alone. */
const playbackStepMs = 1000;

/** Sends playback back to the clip's start whenever it plays past the clip's end from within the clip. */
export function useClipLoop(clip: AudioClip | null, currentMs: number): void {
  const dispatch = useAppDispatch();
  const previousMs = useRef(currentMs);
  useEffect(() => {
    const crossedEnd =
      clip !== null &&
      previousMs.current >= clip.start_ms &&
      previousMs.current < clip.end_ms &&
      currentMs >= clip.end_ms &&
      currentMs - previousMs.current < playbackStepMs;
    previousMs.current = currentMs;
    if (crossedEnd) dispatch(actions.seekRequested(clip.start_ms / 1000));
  }, [clip, currentMs, dispatch]);
}
