import {
  waveformPeaksPerSecond,
  waveformWindowMs,
} from "./waveformWindowPolicy.ts";

/** Makes peaks windows that look like speech, keyed by their start, for stories. */
export function exampleWaveformWindows(
  startsMs: readonly number[],
): ReadonlyMap<number, Uint8Array> {
  return new Map(startsMs.map((start) => [start, syntheticWindow(start)]));
}

/** The start of every peaks window in a file of the given duration. */
export function windowStartsUpTo(durationMs: number): number[] {
  return Array.from(
    { length: Math.ceil(durationMs / waveformWindowMs) },
    (_, index) => index * waveformWindowMs,
  );
}

/** A speech-like signal: bursts of varying loudness with pauses between them. */
function syntheticWindow(startMs: number): Uint8Array {
  const peaks = new Uint8Array(
    (waveformWindowMs / 1000) * waveformPeaksPerSecond,
  );
  for (let i = 0; i < peaks.length; i += 1) {
    const t = (startMs / 1000) * waveformPeaksPerSecond + i;
    const burst = Math.max(0, Math.sin(t / 90)) ** 2;
    const texture = 0.6 + 0.4 * Math.abs(Math.sin(t / 3.7) * Math.cos(t / 11));
    peaks[i] = Math.round(255 * burst * texture);
  }
  return peaks;
}
