import type { WaveformWindowView } from "./waveformWindowPolicy.ts";

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

/** The windows one view wants, and the requests for them by window start. */
export type WaveformViewState = {
  view: WaveformWindowView | null;
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
  player: { view: null, requests: {} },
  clip: { view: null, requests: {} },
};
