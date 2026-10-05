import { actions, selectPlayer } from "@easyimmerse/state";
import { useEffect, useRef } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Pauses playback for a while, as the dictionary pop-up does, and resumes it only if this hook paused it.
 * Playback the user resumes by hand in the meantime is theirs, and `resume` then leaves it alone.
 * `forget` keeps the player paused for good, as when the pause leads into editing a flashcard.
 */
export function usePlaybackPause() {
  const dispatch = useAppDispatch();
  const { isPlaying } = useAppSelector(selectPlayer);
  const hasPaused = useRef(false);
  // The player reports playing again only when someone other than this hook resumed it.
  useEffect(() => {
    if (isPlaying) hasPaused.current = false;
  }, [isPlaying]);
  return {
    pause: () => {
      if (!isPlaying) return;
      hasPaused.current = true;
      dispatch(actions.pauseRequested());
    },
    resume: () => {
      if (!hasPaused.current) return;
      hasPaused.current = false;
      dispatch(actions.playRequested());
    },
    forget: () => {
      hasPaused.current = false;
    },
  };
}
