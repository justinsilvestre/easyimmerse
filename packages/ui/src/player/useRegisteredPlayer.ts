import type { AppStore, BufferedRange } from "@easyimmerse/state";
import { actions, selectPlayerControls } from "@easyimmerse/state";
import type { Rational } from "@easyimmerse/types";
import type { RefObject, SyntheticEvent } from "react";
import { useEffect } from "react";
import { useStore } from "react-redux";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePlayerRegistry } from "../playerRegistryContext.ts";
import { seekTarget } from "./seekTarget.ts";

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Makes the media element the app's current player.
 * Seeks from the store land on it half a frame after the wanted moment, play, volume, mute, and speed requests reach it,
 * and its time, duration, loaded stretches, playing state, and the times its seeks go to flow back into the store.
 * The element starts at the volume, mute state, and speed the store holds.
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
      applySettings(element, selectPlayerControls(store.getState()));
    const withElement = (act: (element: HTMLMediaElement) => void) => () => {
      if (elementRef.current !== null) act(elementRef.current);
    };
    return registry.register({
      seek: (seconds) =>
        withElement((element) => {
          element.currentTime = seekTarget(seconds, frameRate);
        })(),
      togglePlay: withElement(togglePlayback),
      play: withElement(play),
      pause: withElement((element) => element.pause()),
      setVolume: (volume) =>
        withElement((element) => applySettings(element, { volume }))(),
      setMuted: (isMuted) =>
        withElement((element) => applySettings(element, { isMuted }))(),
      setSpeed: (speed) =>
        withElement((element) => applySettings(element, { speed }))(),
    });
  }, [registry, elementRef, frameRate, store]);
  return {
    onTimeUpdate: (event: MediaEvent) =>
      dispatch(actions.playerTimeChanged(event.currentTarget.currentTime)),
    // Reported as the seek starts, since the browser queues the time update of the new position before `seeked`.
    onSeeking: (event: MediaEvent) =>
      dispatch(actions.playerSeeking(event.currentTarget.currentTime)),
    onDurationChange: (event: MediaEvent) => {
      const duration = event.currentTarget.duration;
      if (Number.isFinite(duration))
        dispatch(actions.playerDurationChanged(duration));
    },
    onProgress: (event: MediaEvent) =>
      dispatch(
        actions.playerBufferedChanged(bufferedRangesOf(event.currentTarget)),
      ),
    onPlay: () => dispatch(actions.playerPlayingChanged(true)),
    onPause: () => dispatch(actions.playerPlayingChanged(false)),
  };
}

function bufferedRangesOf(element: HTMLMediaElement): BufferedRange[] {
  const { buffered } = element;
  return Array.from({ length: buffered.length }, (_, index) => ({
    startSeconds: buffered.start(index),
    endSeconds: buffered.end(index),
  }));
}

/** Plays a paused element and pauses a playing one. */
function togglePlayback(element: HTMLMediaElement): void {
  if (element.paused) play(element);
  else element.pause();
}

/** Plays the element. A play the browser refuses leaves it paused. */
function play(element: HTMLMediaElement): void {
  if (element.paused) element.play()?.catch(() => undefined);
}

/** The default rate is set too, because loading a new source resets the rate to it. */
function applySettings(
  element: HTMLMediaElement,
  settings: { volume?: number; isMuted?: boolean; speed?: number },
): void {
  if (settings.volume !== undefined) element.volume = settings.volume;
  if (settings.isMuted !== undefined) element.muted = settings.isMuted;
  if (settings.speed !== undefined) {
    element.defaultPlaybackRate = settings.speed;
    element.playbackRate = settings.speed;
  }
}
