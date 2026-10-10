import { waveformPeaksPerSecond, waveformWindowMs } from "@easyimmerse/state";
import { peaksPerBar } from "./layOutBars.ts";
import type { WaveformView } from "./waveformGeometry.ts";

const peakMs = 1000 / waveformPeaksPerSecond;
const peaksPerWindow = waveformWindowMs / peakMs;

/**
 * The peaks of the view's bars, one per bar, each the loudest peak in its stretch of time scaled to 0–1,
 * or null where no window is loaded; with the view's edges as positions among them, as `layOutBars` takes.
 * The bars start at fixed times, so they keep their peaks as the view follows the current time.
 */
export function barPeaksInView(
  windows: ReadonlyMap<number, Uint8Array>,
  view: WaveformView,
): { peaks: (number | null)[]; from: number; to: number } {
  const perBar = peaksPerBar((view.widthPx * peakMs) / view.spanMs);
  const barMs = perBar * peakMs;
  const from = view.startMs / barMs;
  const to = (view.startMs + view.spanMs) / barMs;
  const firstBar = Math.floor(from);
  const peaks: (number | null)[] = [];
  for (let bar = firstBar; bar < Math.ceil(to); bar += 1)
    peaks.push(loudestPeak(windows, bar * perBar, (bar + 1) * perBar));
  return { peaks, from: from - firstBar, to: to - firstBar };
}

/** The loudest of the file's peaks from one index up to another, or null when no loaded window holds any of them. */
function loudestPeak(
  windows: ReadonlyMap<number, Uint8Array>,
  from: number,
  to: number,
): number | null {
  let loudest = -1;
  for (let index = from; index < to; ) {
    const window = Math.floor(index / peaksPerWindow);
    const windowStart = window * peaksPerWindow;
    const end = Math.min(to, windowStart + peaksPerWindow);
    const values = windows.get(window * waveformWindowMs);
    if (values !== undefined)
      for (let i = index - windowStart; i < end - windowStart; i += 1)
        loudest = Math.max(loudest, values[i] ?? -1);
    index = end;
  }
  return loudest < 0 ? null : loudest / 255;
}
