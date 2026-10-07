import type { Bar } from "./layOutBars.ts";

/** How much of the height the loudest bar fills. */
const fullHeight = 0.96;
/** The opacity of the line drawn where no peak is loaded yet. */
const placeholderAlpha = 0.4;

/** Fills each bar, mirrored around the middle, in the context's fill style. */
export function drawBars(
  ctx: CanvasRenderingContext2D,
  bars: readonly Bar[],
  heightPx: number,
): void {
  const middle = heightPx / 2;
  for (const bar of bars) {
    const half = Math.max(0.5, (bar.peak ?? 0) * middle * fullHeight);
    ctx.globalAlpha = bar.peak === null ? placeholderAlpha : 1;
    ctx.fillRect(bar.x, middle - half, bar.width, half * 2);
  }
  ctx.globalAlpha = 1;
}
