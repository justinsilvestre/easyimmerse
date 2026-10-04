import { actions } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePlayerRegistry } from "../playerRegistryContext.ts";
import { seekTarget } from "./seekTarget.ts";

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Makes the media element the app's current player: seeks from the store land on it, half a frame
 * after the wanted moment, and its time and duration flow back into the store.
 * Returns the event handlers to put on the element.
 */
export function useRegisteredPlayer(
  elementRef: RefObject<HTMLMediaElement | null>,
  frameRate: Rational | null,
) {
  const registry = usePlayerRegistry();
  const dispatch = useAppDispatch();
  useEffect(
    () =>
      registry.register({
        seek: (seconds) => {
          const element = elementRef.current;
          if (element !== null)
            element.currentTime = seekTarget(seconds, frameRate);
        },
      }),
    [registry, elementRef, frameRate],
  );
  return {
    onTimeUpdate: (event: MediaEvent) =>
      dispatch(actions.playerTimeChanged(event.currentTarget.currentTime)),
    onDurationChange: (event: MediaEvent) => {
      const duration = event.currentTarget.duration;
      if (Number.isFinite(duration))
        dispatch(actions.playerDurationChanged(duration));
    },
  };
}
