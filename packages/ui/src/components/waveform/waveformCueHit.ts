import type { Cue } from "@easyimmerse/types";
import type { WaveformView } from "./waveformGeometry.ts";
import { xAtTime } from "./waveformGeometry.ts";

/** The band along the bottom edge of the strip in which the cues are drawn. */
export const cueBandHeightPx = 6;

/** The cue drawn under the point, when the point lies in the cue band, so that a click there seeks to the cue's start. */
export function cueAt(
  view: WaveformView,
  cues: readonly Cue[],
  point: { x: number; y: number },
  heightPx: number,
): Cue | null {
  if (point.y < heightPx - cueBandHeightPx) return null;
  return (
    cues.find(
      (cue) =>
        point.x >= xAtTime(view, cue.start_ms) &&
        point.x <= xAtTime(view, cue.end_ms),
    ) ?? null
  );
}
