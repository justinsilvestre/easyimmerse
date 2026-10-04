import type { AppStore } from "@easyimmerse/state";
import { actions, selectPlayer } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import { useEffect } from "react";
import { useStore } from "react-redux";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePlayerRegistry } from "../playerRegistryContext.ts";
import { seekTarget } from "./seekTarget.ts";

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Makes the media element the app's current player: seeks from the store land on it, half a frame
 * after the wanted moment, play, volume, and speed requests reach it, and its time, duration,
 * and playing state flow back into the store. The element starts at the volume and speed the store holds.
 * Returns the event handlers to put on the element.
 */
export function useRegisteredPlayer(
  elementRef: RefObject<HTMLMediaElement | null>,
  frameRate: Rational | null,
) {
  const registry = usePlayerRegistry();
  const dispatch = useAppDispatch();
  const store = useStore() as AppStore;
  useEffect(() => {
    const element = elementRef.current;
    if (element !== null)
      applySettings(element, selectPlayer(store.getState()));
    const withElement = (act: (element: HTMLMediaElement) => void) => () => {
      if (elementRef.current !== null) act(elementRef.current);
    };
    return registry.register({
      seek: (seconds) =>
        withElement((element) => {
          element.currentTime = seekTarget(seconds, frameRate);
        })(),
      togglePlay: withElement(togglePlayback),
      setVolume: (volume) =>
        withElement((element) => applySettings(element, { volume }))(),
      setSpeed: (speed) =>
        withElement((element) => applySettings(element, { speed }))(),
    });
  }, [registry, elementRef, frameRate, store]);
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
  };
}

/** Plays a paused element and pauses a playing one. A play the browser refuses leaves it paused. */
function togglePlayback(element: HTMLMediaElement): void {
  if (element.paused) element.play()?.catch(() => undefined);
  else element.pause();
}

/** The default rate is set too, because loading a new source resets the rate to it. */
function applySettings(
  element: HTMLMediaElement,
  settings: { volume?: number; speed?: number },
): void {
  if (settings.volume !== undefined) element.volume = settings.volume;
  if (settings.speed !== undefined) {
    element.defaultPlaybackRate = settings.speed;
    element.playbackRate = settings.speed;
  }
}
