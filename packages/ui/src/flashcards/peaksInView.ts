import {
  waveformPeaksPerSecond,
  windowStartOf,
} from "../components/waveform/waveformWindowPolicy.ts";
import type { WaveformView } from "./clipView.ts";

const peakMs = 1000 / waveformPeaksPerSecond;

/** Bars to draw for a view, each between 0 and 1, and the times they cover, which may reach a little past the view. */
export type ViewPeaks = { peaks: number[]; startMs: number; endMs: number };

/**
 * Reads the bars for a view out of the loaded waveform windows. Neighbouring peaks are merged,
 * keeping the loudest, so that no more than `maxBars` are drawn. Peaks not yet loaded are silent.
 */
export function peaksInView(
  windows: ReadonlyMap<number, Uint8Array>,
  view: WaveformView,
  maxBars = 240,
): ViewPeaks {
  const first = Math.max(0, Math.floor(view.startMs / peakMs));
  const last = Math.max(first + 1, Math.ceil(view.endMs / peakMs));
  const perBar = Math.ceil((last - first) / maxBars);
  const peaks: number[] = [];
  for (let index = first; index < last; index += perBar)
    peaks.push(loudestPeak(windows, index, Math.min(index + perBar, last)));
  return {
    peaks,
    startMs: first * peakMs,
    endMs: (first + peaks.length * perBar) * peakMs,
  };
}

function loudestPeak(
  windows: ReadonlyMap<number, Uint8Array>,
  from: number,
  to: number,
): number {
  let loudest = 0;
  for (let index = from; index < to; index += 1)
    loudest = Math.max(loudest, peakAt(windows, index));
  return loudest / 255;
}

function peakAt(windows: ReadonlyMap<number, Uint8Array>, index: number) {
  const timeMs = index * peakMs;
  const windowStart = windowStartOf(timeMs);
  return windows.get(windowStart)?.[index - windowStart / peakMs] ?? 0;
}
