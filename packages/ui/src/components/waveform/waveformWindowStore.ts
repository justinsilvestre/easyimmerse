import type { WaveformWindowView } from "./waveformWindowPolicy.ts";
import {
  planWindowRequests,
  wantedWindows,
  waveformWindowMs,
} from "./waveformWindowPolicy.ts";

/** Loads one window's peaks, or null when the window has none, as for a file without audio. */
export type FetchWaveformWindow = (
  startMs: number,
  endMs: number,
) => Promise<Uint8Array | null>;

/** How long a window stays in memory after the view last wanted it. */
export const waveformWindowRetentionMs = 5 * 60_000;

/** Holds the windows loaded so far and requests missing ones as the view moves. */
export type WaveformWindowStore = {
  update(view: WaveformWindowView): void;
  getWindows(): ReadonlyMap<number, Uint8Array>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
};

/** A window's peaks, or null when the fetch produced none; either way it is not fetched again while retained. */
type Entry = { peaks: Uint8Array | null; lastWantedAt: number };

export function createWaveformWindowStore(
  fetchWindow: FetchWaveformWindow,
  now: () => number = Date.now,
): WaveformWindowStore {
  const entries = new Map<number, Entry>();
  const inFlight = new Set<number>();
  const listeners = new Set<() => void>();
  let snapshot: ReadonlyMap<number, Uint8Array> = new Map();
  let view: WaveformWindowView | null = null;
  let disposed = false;

  function requestMissing(): void {
    if (view === null) return;
    const held = new Set(entries.keys());
    for (const start of planWindowRequests(view, held, inFlight))
      request(start, view.durationMs);
  }

  function request(startMs: number, durationMs: number): void {
    inFlight.add(startMs);
    const endMs = Math.min(startMs + waveformWindowMs, durationMs);
    fetchWindow(startMs, endMs).then(
      (peaks) => settle(startMs, peaks),
      () => settle(startMs, null),
    );
  }

  function settle(startMs: number, peaks: Uint8Array | null): void {
    inFlight.delete(startMs);
    if (disposed) return;
    entries.set(startMs, { peaks, lastWantedAt: now() });
    snapshot = loadedWindows(entries);
    for (const listener of listeners) listener();
    requestMissing();
  }

  return {
    update(nextView) {
      view = nextView;
      markWanted(entries, wantedWindows(nextView), now());
      evictStale(entries, now() - waveformWindowRetentionMs);
      requestMissing();
    },
    getWindows: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      listeners.clear();
    },
  };
}

function markWanted(
  entries: Map<number, Entry>,
  wanted: readonly number[],
  at: number,
): void {
  for (const start of wanted) {
    const entry = entries.get(start);
    if (entry) entry.lastWantedAt = at;
  }
}

function evictStale(entries: Map<number, Entry>, cutoff: number): void {
  for (const [start, entry] of entries)
    if (entry.lastWantedAt < cutoff) entries.delete(start);
}

function loadedWindows(
  entries: ReadonlyMap<number, Entry>,
): ReadonlyMap<number, Uint8Array> {
  const loaded = new Map<number, Uint8Array>();
  for (const [start, entry] of entries)
    if (entry.peaks !== null) loaded.set(start, entry.peaks);
  return loaded;
}
