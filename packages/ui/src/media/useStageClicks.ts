import type { MouseEvent } from "react";
import { doubleClickMs } from "../components/gestureTiming.ts";
import { useTimer } from "../hooks/useTimer.ts";
import { stagePictureAttribute } from "../player/stagePicture.ts";

/**
 * Returns the click handler for the stage, which acts only on clicks on its picture:
 * a click plays or pauses at once, and a double-click fills the screen or leaves it.
 * The second click of a double-click plays or pauses once more, so that a double-click leaves playback as it was.
 */
export function useStageClicks(
  onTogglePlay: () => void,
  onToggleFullscreen: (() => void) | undefined,
) {
  const timer = useTimer();
  return (event: MouseEvent<HTMLElement>) => {
    if (!isOnPicture(event)) return;
    onTogglePlay();
    if (onToggleFullscreen === undefined) return;
    if (timer.isPending()) {
      timer.cancel();
      onToggleFullscreen();
    } else {
      timer.restart(doubleClickMs, () => undefined);
    }
  };
}

function isOnPicture(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as Element;
  return (
    event.currentTarget.contains(target) &&
    target.closest(`[${stagePictureAttribute}]`) !== null
  );
}
