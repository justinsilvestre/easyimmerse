import type { RefObject } from "react";
import { useEffect, useState } from "react";

/** The events after which a video may report new dimensions. Neither bubbles, so they are caught on their way down. */
const dimensionEvents = ["loadedmetadata", "resize", "emptied"] as const;

/**
 * The proportions, as width over height, of the video playing inside the element,
 * or null while there is none or it has not loaded its dimensions, as for an audio file.
 */
export function usePictureAspectRatio(
  ref: RefObject<HTMLElement | null>,
): number | null {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const update = () => setRatio(videoAspectRatioIn(element));
    update();
    for (const type of dimensionEvents)
      element.addEventListener(type, update, true);
    return () => {
      for (const type of dimensionEvents)
        element.removeEventListener(type, update, true);
    };
  }, [ref]);
  return ratio;
}

function videoAspectRatioIn(element: HTMLElement): number | null {
  const video = element.querySelector("video");
  if (video === null || video.videoWidth === 0 || video.videoHeight === 0)
    return null;
  return video.videoWidth / video.videoHeight;
}
