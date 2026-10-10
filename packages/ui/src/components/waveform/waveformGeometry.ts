import { clampVisibleSpan } from "@easyimmerse/state";

/** The span of media the strip shows and the width it is drawn at. */
export type WaveformView = {
  startMs: number;
  spanMs: number;
  widthPx: number;
};

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
