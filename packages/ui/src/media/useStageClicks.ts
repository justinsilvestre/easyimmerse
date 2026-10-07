import type { MouseEvent } from "react";
import { doubleClickMs } from "../components/gestureTiming.ts";
import { useTimer } from "../hooks/useTimer.ts";
import { stagePictureAttribute } from "../player/stagePicture.ts";

/**
 * Returns the click handler for the stage, which acts only on clicks on its picture:
 * a click plays or pauses, and a double-click fills the screen or leaves it.
 * Where the screen cannot be filled, a click plays or pauses at once; elsewhere it waits out the double-click interval,
 * so that a double-click does not also play and pause.
 */
export function useStageClicks(
  onTogglePlay: () => void,
  onToggleFullscreen: (() => void) | undefined,
) {
  const timer = useTimer();
  return (event: MouseEvent<HTMLElement>) => {
    if (!isOnPicture(event)) return;
    if (onToggleFullscreen === undefined) {
      onTogglePlay();
    } else if (timer.isPending()) {
      timer.cancel();
      onToggleFullscreen();
    } else {
      timer.restart(doubleClickMs, onTogglePlay);
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
