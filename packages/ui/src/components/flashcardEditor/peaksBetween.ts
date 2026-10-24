/** Cuts the peaks of the part of the file between the two times out of the peaks of the whole file. */
export function peaksBetween(
  peaks: readonly number[],
  durationMs: number,
  startMs: number,
  endMs: number,
): readonly number[] {
  return peaks.slice(
    Math.floor((peaks.length * startMs) / durationMs),
    Math.ceil((peaks.length * endMs) / durationMs),
  );
}
