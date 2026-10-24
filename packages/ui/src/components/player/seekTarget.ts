import type { Rational } from "@easyimmerse/types";

/** The frame rate assumed when the file's is unknown, as a frame duration in seconds. */
const fallbackFrameSeconds = 1 / 60;

/**
 * The time to seek a media element to in order to show the frame at the wanted moment.
 * A seek that lands exactly on a frame boundary sometimes shows the previous frame,
 * so the target is half a frame later. Displayed times keep the wanted moment.
 */
export function seekTarget(
  wantedSeconds: number,
  frameRate: Rational | null,
): number {
  return wantedSeconds + frameSeconds(frameRate) / 2;
}

function frameSeconds(frameRate: Rational | null): number {
  if (frameRate === null || frameRate.num <= 0 || frameRate.den <= 0)
    return fallbackFrameSeconds;
  return frameRate.den / frameRate.num;
}
