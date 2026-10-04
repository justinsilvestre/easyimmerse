import { scaledSpan } from "./waveformGeometry.ts";

/** A two-finger zoom, from the distance between the fingers and the span shown when it began. */
export type WaveformPinch = { startDistance: number; startSpanMs: number };

/** Begins a pinch with the pointers' horizontal positions, by pointer id. */
export function startPinch(
  pointerXs: ReadonlyMap<number, number>,
  spanMs: number,
): WaveformPinch {
  return { startDistance: pointerDistance(pointerXs), startSpanMs: spanMs };
}

/** The span to show now: spreading the fingers apart zooms in, and bringing them together zooms out. */
export function pinchedSpan(
  pinch: WaveformPinch,
  pointerXs: ReadonlyMap<number, number>,
  durationMs: number,
): number {
  const factor = pinch.startDistance / pointerDistance(pointerXs);
  return scaledSpan(pinch.startSpanMs, factor, durationMs);
}

function pointerDistance(pointerXs: ReadonlyMap<number, number>): number {
  const [a = 0, b = 0] = [...pointerXs.values()];
  return Math.max(1, Math.abs(a - b));
}
