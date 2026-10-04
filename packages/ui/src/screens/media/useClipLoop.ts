import { actions } from "@easyimmerse/state";
import type { AudioClip } from "@easyimmerse/types";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "../../hooks/useAppDispatch.ts";

/** Sends playback back to the clip's start whenever it plays past the clip's end. */
export function useClipLoop(clip: AudioClip | null, currentMs: number): void {
  const dispatch = useAppDispatch();
  const previousMs = useRef(currentMs);
  useEffect(() => {
    const crossedEnd =
      clip !== null &&
      previousMs.current < clip.end_ms &&
      currentMs >= clip.end_ms;
    previousMs.current = currentMs;
    if (crossedEnd) dispatch(actions.seekRequested(clip.start_ms / 1000));
  }, [clip, currentMs, dispatch]);
}
