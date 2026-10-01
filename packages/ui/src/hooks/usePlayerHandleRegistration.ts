import type { PlayerHandle } from "@easyimmerse/state";
import type { TimeRange } from "@easyimmerse/types";
import { type RefObject, useEffect } from "react";
import { usePlayerRegistry } from "../playerRegistryContext.ts";

/** Registers a handle controlling the media element for as long as the element is mounted. */
export function usePlayerHandleRegistration(
  element: HTMLMediaElement | null,
  loop: RefObject<TimeRange | null>,
) {
  const registry = usePlayerRegistry();
  useEffect(() => {
    if (element === null) return;
    return registry.register(createMediaElementHandle(element, loop));
  }, [registry, element, loop]);
}

/** Builds a handle on the element. The loop is kept in the ref for the element's timeupdate handler to enforce. */
function createMediaElementHandle(
  element: HTMLMediaElement,
  loop: RefObject<TimeRange | null>,
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
    setLoop: (range) => {
      loop.current = range;
    },
    setPlaybackRate: (rate) => {
      element.playbackRate = rate;
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
