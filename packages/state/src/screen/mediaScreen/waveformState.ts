/** The two views that fetch waveform windows: the strip under the player, and the clip in the flashcard editor. */
export type WaveformViewName = "player" | "clip";

/**
 * Where the request for one window stands. A loaded window's peaks are in the cache, under the start and end it was requested with.
 * A failed window waits for its retry timer before it is requested again.
 */
export type WindowRequest = {
  endMs: number;
  status: "loading" | "loaded" | "failed";
};

/** The requests for one view's windows, by window start. */
export type WaveformViewState = {
  requests: Partial<Record<number, WindowRequest>>;
};

/** The media screen's waveform: the player strip's zoom, and the windows of each view. */
export type WaveformState = {
  /** The span the user last zoomed the player strip to, before it is fitted to the file's duration. */
  requestedSpanMs: number;
  player: WaveformViewState;
  clip: WaveformViewState;
};

/** The waveform before any view is known. */
export const initialWaveform: WaveformState = {
  requestedSpanMs: 60_000,
  player: { requests: {} },
  clip: { requests: {} },
};

/** The starts of the view's windows whose requests stand as given. */
export function startsWith(
  state: WaveformViewState,
  status: WindowRequest["status"],
): Set<number> {
  const starts = new Set<number>();
  for (const [start, request] of Object.entries(state.requests))
    if (request?.status === status) starts.add(Number(start));
  return starts;
}

/** The view with one window's request marked as given. */
export function withStatus(
  state: WaveformViewState,
  start: number,
  status: WindowRequest["status"],
): WaveformViewState {
  const request = state.requests[start] as WindowRequest;
  return {
    ...state,
    requests: { ...state.requests, [start]: { ...request, status } },
  };
}

/** The view without one window's request, so that the window may be requested again. */
export function withoutWindow(
  state: WaveformViewState,
  start: number,
): WaveformViewState {
  const { [start]: _removed, ...requests } = state.requests;
  return { ...state, requests };
}
