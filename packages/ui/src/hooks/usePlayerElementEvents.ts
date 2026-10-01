import { actions } from "@easyimmerse/state";
import type { TimeRange } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import { keepWithinLoop, toMs } from "./keepWithinLoop.ts";
import { useAppDispatch } from "./useAppDispatch.ts";

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Returns event handlers for a media element that report its time, duration, and playing state to the store.
 * The time handler also repeats the loop in the ref, seeking back to its start once the time leaves it.
 */
export function usePlayerElementEvents(loop: RefObject<TimeRange | null>) {
  const dispatch = useAppDispatch();
  return {
    onTimeUpdate: ({ currentTarget }: MediaEvent) => {
      keepWithinLoop(currentTarget, loop.current);
      dispatch(actions.playerTimeChanged(toMs(currentTarget.currentTime)));
    },
    onLoadedMetadata: ({ currentTarget }: MediaEvent) => {
      if (Number.isFinite(currentTarget.duration))
        dispatch(actions.playerDurationKnown(toMs(currentTarget.duration)));
    },
    onPlay: () => dispatch(actions.playerPlayingChanged(true)),
    onPause: () => dispatch(actions.playerPlayingChanged(false)),
    onEnded: () => dispatch(actions.playerPlayingChanged(false)),
  };
}
