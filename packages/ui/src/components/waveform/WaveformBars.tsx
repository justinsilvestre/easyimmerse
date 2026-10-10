import { useEffect, useRef } from "react";
import { useElementSize } from "../../hooks/useElementSize.ts";
import { drawBars } from "./drawBars.ts";
import { fitCanvas } from "./fitCanvas.ts";
import { layOutBars } from "./layOutBars.ts";

/**
 * Draws audio peaks as evenly spaced bars mirrored around the middle, filling its container.
 * Peaks lying closer together than a bar's spacing share a bar, which shows the loudest of them.
 */
export function WaveformBars({
  peaks,
  from = 0,
  to = peaks.length,
}: {
  /** Loudness from 0 to 1 of consecutive stretches of equal length, or null where not loaded yet. */
  peaks: readonly (number | null)[];
  /** The position at the left edge, counted in peaks from the first. The first peak's start when left out. */
  from?: number;
  /** The position at the right edge, counted in peaks from the first. The last peak's end when left out. */
  to?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height } = useElementSize(canvasRef);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || width === 0 || to <= from) return;
    const pixelRatio = fitCanvas(canvas, ctx, {
      widthPx: width,
      heightPx: height,
    });
    ctx.fillStyle = getComputedStyle(canvas).color;
    const frame = { from, to, widthPx: width, pixelRatio };
    drawBars(ctx, layOutBars(peaks, frame), height);
  }, [peaks, from, to, width, height]);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="block size-full text-fg-faint"
    />
  );
}
