import { actions, selectPlayer } from "@easyimmerse/state";
import { useRef } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";
import { useAppSelector } from "./useAppSelector.ts";

/**
 * Pauses playback for a while, as the dictionary pop-up does, and resumes it only if it was this hook that paused it.
 * `forget` keeps the player paused for good, as when the pause leads into editing a flashcard.
 */
export function usePlaybackPause() {
  const dispatch = useAppDispatch();
  const { isPlaying } = useAppSelector(selectPlayer);
  const hasPaused = useRef(false);
  return {
    pause: () => {
      if (!isPlaying) return;
      hasPaused.current = true;
      dispatch(actions.playToggleRequested());
    },
    resume: () => {
      if (!hasPaused.current) return;
      hasPaused.current = false;
      dispatch(actions.playToggleRequested());
    },
    forget: () => {
      hasPaused.current = false;
    },
  };
}
