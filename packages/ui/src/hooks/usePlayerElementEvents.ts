import { actions } from "@easyimmerse/state";
import type { TimeRange } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import { useAppDispatch } from "./useAppDispatch.ts";

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Returns event handlers for a media element that report its time, duration, and playing state to the store.
 * The time handler also repeats the loop in the ref, seeking back to its start once the time reaches its end.
 */
export function usePlayerElementEvents(loop: RefObject<TimeRange | null>) {
  const dispatch = useAppDispatch();
  return {
    onTimeUpdate: ({ currentTarget }: MediaEvent) => {
      repeatLoop(currentTarget, loop.current);
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

function repeatLoop(element: HTMLMediaElement, loop: TimeRange | null) {
  if (loop !== null && toMs(element.currentTime) >= loop.end_ms)
    element.currentTime = loop.start_ms / 1000;
}

function toMs(seconds: number): number {
  return Math.round(seconds * 1000);
}
