import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import type { WaveformView } from "./waveformGeometry.ts";
import { scaledSpan } from "./waveformGeometry.ts";

/**
 * Zooms on wheel events. The listener is attached by hand because React's wheel listener is passive,
 * and the page must not scroll while the strip zooms.
 */
export function useWheelZoom(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  view: WaveformView,
  durationMs: number,
  onVisibleSpanChange: (spanMs: number) => void,
) {
  const latest = useRef({ view, durationMs, onVisibleSpanChange });
  latest.current = { view, durationMs, onVisibleSpanChange };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.min(2, Math.max(0.5, Math.exp(event.deltaY / 100)));
      const current = latest.current;
      current.onVisibleSpanChange(
        scaledSpan(current.view.spanMs, factor, current.durationMs),
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef]);
}
