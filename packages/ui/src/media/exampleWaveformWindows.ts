import {
  waveformPeaksPerSecond,
  waveformWindowMs,
} from "../components/waveform/waveformWindowPolicy.ts";

const peaksPerWindow = (waveformWindowMs / 1000) * waveformPeaksPerSecond;

/** Waveform windows covering the duration with a signal that looks like speech, the same every time, for stories. */
export function exampleWaveformWindows(
  durationMs: number,
): ReadonlyMap<number, Uint8Array> {
  const windows = new Map<number, Uint8Array>();
  for (let start = 0; start < durationMs; start += waveformWindowMs)
    windows.set(start, speechLikeWindow(start));
  return windows;
}

function speechLikeWindow(startMs: number): Uint8Array {
  const firstPeak = (startMs / 1000) * waveformPeaksPerSecond;
  return Uint8Array.from({ length: peaksPerWindow }, (_, offset) => {
    const t = firstPeak + offset;
    const burst = Math.max(0, Math.sin(t / 90)) ** 2;
    const texture = 0.6 + 0.4 * Math.abs(Math.sin(t / 3.7) * Math.cos(t / 11));
    return Math.round(255 * burst * texture);
  });
}
