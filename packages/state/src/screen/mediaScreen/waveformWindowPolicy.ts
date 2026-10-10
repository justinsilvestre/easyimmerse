/** Peaks arrive in aligned windows of this length. */
export const waveformWindowMs = 30_000;
/** How many peaks a window holds for each second of the media. */
export const waveformPeaksPerSecond = 100;
const maxWindowRequestsInFlight = 3;
/** How long after a failed request a window may be requested again. */
export const waveformWindowRetryMs = 5_000;
/** The widest visible span: as many windows as can be kept arriving while the view moves. */
export const maxVisibleSpanMs = 10 * waveformWindowMs;

/** The stretch of a media file that a waveform view shows, which decides the windows it wants. */
export type WaveformWindowView = {
  viewStartMs: number;
  viewEndMs: number;
  /** The current time, or the view's centre when the current time is out of view. */
  focusMs: number;
  durationMs: number;
};

/** The start of the window that holds the given time. */
export function windowStartOf(timeMs: number): number {
  return Math.floor(timeMs / waveformWindowMs) * waveformWindowMs;
}

/**
 * The window starts to request now, in priority order, never putting more than
 * `maxWindowRequestsInFlight` requests in flight at once.
 * Windows already loaded, in flight, or waiting to retry after a failed fetch are skipped.
 */
export function planWindowRequests(
  view: WaveformWindowView,
  loaded: ReadonlySet<number>,
  inFlight: ReadonlySet<number>,
  awaitingRetry: ReadonlySet<number>,
): number[] {
  const slots = Math.max(0, maxWindowRequestsInFlight - inFlight.size);
  const isSkipped = (start: number) =>
    loaded.has(start) || inFlight.has(start) || awaitingRetry.has(start);
  return wantedWindows(view)
    .filter((start) => !isSkipped(start))
    .slice(0, slots);
}

/**
 * The windows worth holding for the view, most urgent first: the one holding the focus,
 * then the rest of the visible span in order, then one before and one after.
 */
export function wantedWindows(view: WaveformWindowView): number[] {
  if (view.durationMs <= 0) return [];
  const lastStart = windowStartOf(view.durationMs - 1);
  const focusMs = Math.min(
    Math.max(view.focusMs, view.viewStartMs),
    view.viewEndMs,
  );
  const first = windowStartOf(Math.max(0, view.viewStartMs));
  const last = windowStartOf(Math.max(0, view.viewEndMs - 1));
  const candidates = [windowStartOf(focusMs)];
  for (let start = first; start <= last; start += waveformWindowMs)
    candidates.push(start);
  candidates.push(first - waveformWindowMs, last + waveformWindowMs);
  return [...new Set(candidates)].filter(
    (start) => start >= 0 && start <= lastStart,
  );
}
