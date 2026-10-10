import { maxVisibleSpanMs } from "./waveformWindowPolicy.ts";

/** The narrowest visible span. */
const minVisibleSpanMs = 2_000;

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
