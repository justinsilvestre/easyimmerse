import type { WaveformWindowView } from "@easyimmerse/state";
import {
  planWindowRequests,
  wantedWindows,
  waveformWindowMs,
} from "@easyimmerse/state";
import type { WaveformWindowEntry } from "./waveformWindowEntries.ts";
import {
  evictStale,
  failedSince,
  loadedWindows,
  markWanted,
} from "./waveformWindowEntries.ts";

/** Loads one window's peaks, or null when the window has none, as for a file without audio. */
export type FetchWaveformWindow = (
  startMs: number,
  endMs: number,
) => Promise<Uint8Array | null>;

/** How long a window stays in memory after the view last wanted it. */
export const waveformWindowRetentionMs = 5 * 60_000;

/** How long after a failed fetch the window may be requested again. */
export const waveformWindowRetryMs = 5_000;

/** Holds the windows loaded so far and requests missing ones as the view moves. */
export type WaveformWindowStore = {
  update(view: WaveformWindowView): void;
  getWindows(): ReadonlyMap<number, Uint8Array>;
  subscribe(listener: () => void): () => void;
  dispose(): void;
};

export function createWaveformWindowStore(
  fetchWindow: FetchWaveformWindow,
  now: () => number = Date.now,
): WaveformWindowStore {
  const entries = new Map<number, WaveformWindowEntry>();
  const inFlight = new Set<number>();
  const failedAt = new Map<number, number>();
  const retryTimers = new Set<ReturnType<typeof setTimeout>>();
  const listeners = new Set<() => void>();
  let snapshot: ReadonlyMap<number, Uint8Array> = new Map();
  let view: WaveformWindowView | null = null;
  let disposed = false;

  function requestMissing(): void {
    if (view === null || disposed) return;
    const awaitingRetry = failedSince(failedAt, now() - waveformWindowRetryMs);
    const loaded = new Set(entries.keys());
    const starts = planWindowRequests(view, loaded, inFlight, awaitingRetry);
    for (const start of starts) request(start, view.durationMs);
  }

  function request(startMs: number, durationMs: number): void {
    inFlight.add(startMs);
    const endMs = Math.min(startMs + waveformWindowMs, durationMs);
    fetchWindow(startMs, endMs).then(
      (peaks) => settle(startMs, peaks),
      () => fail(startMs),
    );
  }

  function settle(startMs: number, peaks: Uint8Array | null): void {
    inFlight.delete(startMs);
    if (disposed) return;
    failedAt.delete(startMs);
    entries.set(startMs, { peaks, lastWantedAt: now() });
    publish();
    requestMissing();
  }

  function fail(startMs: number): void {
    inFlight.delete(startMs);
    if (disposed) return;
    failedAt.set(startMs, now());
    scheduleRetry();
    requestMissing();
  }

  function scheduleRetry(): void {
    const timer = setTimeout(() => {
      retryTimers.delete(timer);
      requestMissing();
    }, waveformWindowRetryMs);
    retryTimers.add(timer);
  }

  function publish(): void {
    snapshot = loadedWindows(entries);
    for (const listener of listeners) listener();
  }

  return {
    update(nextView) {
      view = nextView;
      markWanted(entries, wantedWindows(nextView), now());
      if (evictStale(entries, now() - waveformWindowRetentionMs)) publish();
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
      for (const timer of retryTimers) clearTimeout(timer);
    },
  };
}
