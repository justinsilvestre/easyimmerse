import type { PlayerHandle, PlayerLoop } from "@easyimmerse/state";
import { type RefObject, useCallback } from "react";
import { usePlayerRegistry } from "../playerRegistryContext.ts";
import { keepWithinLoop } from "./keepWithinLoop.ts";

/**
 * Returns a ref callback for the media element. It keeps the element in `media` and registers a handle on it while it is mounted.
 * Registering as the element attaches, rather than in an effect, lets effects of enclosing components reach the player on mount.
 */
export function usePlayerHandleRegistration(
  media: RefObject<HTMLMediaElement | null>,
  loop: RefObject<PlayerLoop | null>,
) {
  const registry = usePlayerRegistry();
  return useCallback(
    (element: HTMLMediaElement | null) => {
      media.current = element;
      if (element === null) return;
      const unregister = registry.register(
        createMediaElementHandle(element, loop),
      );
      return () => {
        unregister();
        media.current = null;
      };
    },
    [registry, media, loop],
  );
}

/**
 * Builds a handle on the element. The loop is kept in the ref for the element's timeupdate handler to enforce,
 * and setting it while the time lies outside it seeks to its restart time right away.
 */
function createMediaElementHandle(
  element: HTMLMediaElement,
  loop: RefObject<PlayerLoop | null>,
): PlayerHandle {
  return {
    seek: (ms) => {
      element.currentTime = ms / 1000;
    },
    play: () => {
      // Browsers reject play() when autoplay is blocked. The element then reports no play event.
      element.play()?.catch(() => undefined);
    },
    pause: () => element.pause(),
    setLoop: (next) => {
      loop.current = next;
      keepWithinLoop(element, next);
    },
    setPlaybackRate: (rate) => {
      element.playbackRate = rate;
      // Loading new media resets the rate to the default, so the default follows too.
      element.defaultPlaybackRate = rate;
    },
    setVolume: (volume) => {
      element.volume = volume;
    },
    captureFrame: () =>
      element instanceof HTMLVideoElement ? captureVideoFrame(element) : null,
  };
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (context === null) return null;
  context.drawImage(video, 0, 0);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    // A video from another origin without CORS headers taints the canvas, which then refuses to encode.
    return null;
  }
}
