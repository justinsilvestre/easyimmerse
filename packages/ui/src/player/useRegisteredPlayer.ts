import type { PlayerCommand } from "@easyimmerse/state";
import { actions } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import { useEffect } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePlayerRegistry } from "../playerRegistryContext.ts";
import { captureVideoFrame } from "./captureVideoFrame.ts";
import { seekTarget } from "./seekTarget.ts";

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Makes the media element the app's current player: seeks and commands from the store land on it,
 * seeks half a frame after the wanted moment, and its time, duration, and playing state flow back into the store.
 * Returns the event handlers to put on the element.
 */
export function useRegisteredPlayer(
  elementRef: RefObject<HTMLVideoElement | null>,
  frameRate: Rational | null,
  hasVideo: boolean,
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
        control: (command) => {
          const element = elementRef.current;
          if (element !== null) applyCommand(element, command);
        },
        captureFrameAt: async (seconds) => {
          const element = elementRef.current;
          if (element === null || !hasVideo) return null;
          return captureVideoFrame(element, {
            seekToSeconds: seekTarget(seconds, frameRate),
          });
        },
      }),
    [registry, elementRef, frameRate, hasVideo],
  );
  return {
    onTimeUpdate: (event: MediaEvent) =>
      dispatch(actions.playerTimeChanged(event.currentTarget.currentTime)),
    onDurationChange: (event: MediaEvent) => {
      const duration = event.currentTarget.duration;
      if (Number.isFinite(duration))
        dispatch(actions.playerDurationChanged(duration));
    },
    onPlay: () => dispatch(actions.playerPlayingChanged(true)),
    onPause: () => dispatch(actions.playerPlayingChanged(false)),
    onVolumeChange: (event: MediaEvent) =>
      dispatch(actions.playerVolumeChanged(event.currentTarget.volume)),
    onRateChange: (event: MediaEvent) =>
      dispatch(actions.playerRateChanged(event.currentTarget.playbackRate)),
  };
}

function applyCommand(element: HTMLMediaElement, command: PlayerCommand) {
  switch (command.kind) {
    case "play":
      // A play the browser refuses, such as one without a user gesture, leaves the player paused, which the store already shows.
      element.play()?.catch(() => undefined);
      return;
    case "pause":
      element.pause();
      return;
    case "setVolume":
      element.volume = command.volume;
      return;
    case "setRate":
      element.playbackRate = command.rate;
      return;
  }
}
