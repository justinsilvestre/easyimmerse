/** A window's peaks, or null when the fetch produced none; either way it is not fetched again while retained. */
export type WaveformWindowEntry = {
  peaks: Uint8Array | null;
  lastWantedAt: number;
};

export function markWanted(
  entries: Map<number, WaveformWindowEntry>,
  wanted: readonly number[],
  at: number,
): void {
  for (const start of wanted) {
    const entry = entries.get(start);
    if (entry) entry.lastWantedAt = at;
  }
}

/** Removes the entries last wanted before the cutoff, and tells whether any were removed. */
export function evictStale(
  entries: Map<number, WaveformWindowEntry>,
  cutoff: number,
): boolean {
  const sizeBefore = entries.size;
  for (const [start, entry] of entries)
    if (entry.lastWantedAt < cutoff) entries.delete(start);
  return entries.size < sizeBefore;
}

/** The windows whose last failed fetch happened after the cutoff. */
export function failedSince(
  failedAt: ReadonlyMap<number, number>,
  cutoff: number,
): Set<number> {
  const failed = new Set<number>();
  for (const [start, failedAtMs] of failedAt)
    if (failedAtMs > cutoff) failed.add(start);
  return failed;
}

/** The peaks of the entries that have some, by window start. */
export function loadedWindows(
  entries: ReadonlyMap<number, WaveformWindowEntry>,
): ReadonlyMap<number, Uint8Array> {
  const loaded = new Map<number, Uint8Array>();
  for (const [start, entry] of entries)
    if (entry.peaks !== null) loaded.set(start, entry.peaks);
  return loaded;
}
