import { maxVisibleSpanMs } from "./waveformWindowPolicy.ts";

/** The narrowest visible span. */
const minVisibleSpanMs = 2_000;

/** The span of media the strip shows and the width it is drawn at. */
export type WaveformView = {
  startMs: number;
  spanMs: number;
  widthPx: number;
};

/** Clamps a wanted span to the zoom limits and to the media's length. */
export function clampVisibleSpan(spanMs: number, durationMs: number): number {
  const widest = Math.min(
    maxVisibleSpanMs,
    Math.max(durationMs, minVisibleSpanMs),
  );
  return Math.min(Math.max(spanMs, minVisibleSpanMs), widest);
}

/** Centres the view on the current time, except at the ends of the media. */
export function computeViewStart(
  currentTimeMs: number,
  spanMs: number,
  durationMs: number,
): number {
  const latestStart = Math.max(0, durationMs - spanMs);
  return Math.min(Math.max(currentTimeMs - spanMs / 2, 0), latestStart);
}

export function timeAtX(view: WaveformView, x: number): number {
  return view.startMs + (x / view.widthPx) * view.spanMs;
}

export function xAtTime(view: WaveformView, timeMs: number): number {
  return ((timeMs - view.startMs) / view.spanMs) * view.widthPx;
}

/** Halves or doubles the span, within the limits. */
export function zoomedSpan(
  spanMs: number,
  direction: "in" | "out",
  durationMs: number,
): number {
  return scaledSpan(spanMs, direction === "in" ? 0.5 : 2, durationMs);
}

export function scaledSpan(
  spanMs: number,
  factor: number,
  durationMs: number,
): number {
  return clampVisibleSpan(spanMs * factor, durationMs);
}

export function canZoom(
  spanMs: number,
  direction: "in" | "out",
  durationMs: number,
): boolean {
  return zoomedSpan(spanMs, direction, durationMs) !== spanMs;
}
