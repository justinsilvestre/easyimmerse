import { actions, selectCurrentTimeMs } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { useCallback } from "react";
import { findAdjacentCueStart } from "../cues/findAdjacentCueStart.ts";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppStore } from "./useAppStore.ts";

/** How far a skip moves when there is no cue to skip to. */
export const playerSkipMs = 5000;

/** Returns a function that seeks to the previous or next cue, or by five seconds when there is none in that direction. */
export function usePlayerSkip(cues: readonly Cue[] | null) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  return useCallback(
    (direction: "previous" | "next") => {
      const timeMs = selectCurrentTimeMs(store.getState());
      const cueStart = cues && findAdjacentCueStart(cues, timeMs, direction);
      if (cueStart !== null) dispatch(actions.seekRequested(cueStart));
      else
        dispatch(
          actions.skipRequested(
            direction === "next" ? playerSkipMs : -playerSkipMs,
          ),
        );
    },
    [cues, dispatch, store],
  );
}
