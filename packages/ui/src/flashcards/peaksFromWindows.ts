import { waveformPeaksPerSecond } from "../components/waveform/waveformWindowPolicy.ts";

/** How many peaks per second the clip editor draws, fewer than the windows hold so a long file stays light. */
const clipPeaksPerSecond = 20;

/**
 * Spreads the peaks windows loaded so far over a whole file, scaled from 0–255 to 0–1, at the clip editor's resolution.
 * Parts of the file with no loaded window stay silent.
 */
export function peaksFromWindows(
  windows: ReadonlyMap<number, Uint8Array>,
  durationMs: number,
): number[] {
  const peakMs = 1000 / clipPeaksPerSecond;
  const sourceMs = 1000 / waveformPeaksPerSecond;
  const peaks = new Array<number>(Math.ceil(durationMs / peakMs)).fill(0);
  for (const [startMs, values] of windows) {
    values.forEach((value, index) => {
      const target = Math.floor((startMs + index * sourceMs) / peakMs);
      if (target < peaks.length)
        peaks[target] = Math.max(peaks[target] ?? 0, value / 255);
    });
  }
  return peaks;
}
