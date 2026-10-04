import type { Cue } from "@easyimmerse/types";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import { waveformColors } from "./waveformColors.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { timeAtX, xAtTime } from "./waveformGeometry.ts";
import { screenshotMarkerHeightPx } from "./waveformHitTest.ts";
import {
  waveformPeaksPerSecond,
  windowStartOf,
} from "./waveformWindowPolicy.ts";

export type WaveformScene = {
  view: WaveformView;
  heightPx: number;
  currentTimeMs: number;
  windows: ReadonlyMap<number, Uint8Array>;
  cues: readonly Cue[];
  segments: readonly FlashcardSegment[];
};

const peakMs = 1000 / waveformPeaksPerSecond;
const cueBandHeightPx = 6;

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  scene: WaveformScene,
): void {
  ctx.fillStyle = waveformColors.background;
  ctx.fillRect(0, 0, scene.view.widthPx, scene.heightPx);
  drawPeaks(ctx, scene);
  drawCues(ctx, scene);
  for (const segment of scene.segments) drawSegment(ctx, scene, segment);
  drawPlayhead(ctx, scene);
}

function drawPeaks(ctx: CanvasRenderingContext2D, scene: WaveformScene): void {
  const middle = scene.heightPx / 2;
  for (let x = 0; x < scene.view.widthPx; x += 1) {
    const peak = loudestPeak(
      scene,
      timeAtX(scene.view, x),
      timeAtX(scene.view, x + 1),
    );
    if (peak === null) {
      ctx.fillStyle = waveformColors.placeholder;
      ctx.fillRect(x, middle - 0.5, 1, 1);
    } else {
      const half = Math.max(0.5, (peak / 255) * (middle - 2));
      ctx.fillStyle = waveformColors.peaks;
      ctx.fillRect(x, middle - half, 1, half * 2);
    }
  }
}

/** The loudest peak between the two times, or null when no loaded window covers them. */
function loudestPeak(
  scene: WaveformScene,
  fromMs: number,
  toMs: number,
): number | null {
  let loudest: number | null = null;
  const lastMs = Math.max(fromMs, toMs - peakMs);
  for (let ms = fromMs; ms <= lastMs; ms += peakMs) {
    const peak = peakAt(scene.windows, ms);
    if (peak !== null) loudest = Math.max(loudest ?? 0, peak);
  }
  return loudest;
}

function peakAt(
  windows: ReadonlyMap<number, Uint8Array>,
  ms: number,
): number | null {
  const start = windowStartOf(ms);
  const peaks = windows.get(start);
  if (peaks === undefined) return null;
  return peaks[Math.floor((ms - start) / peakMs)] ?? null;
}

function drawCues(ctx: CanvasRenderingContext2D, scene: WaveformScene): void {
  const top = scene.heightPx - cueBandHeightPx;
  for (const cue of scene.cues) {
    const left = xAtTime(scene.view, cue.start_ms);
    const width = xAtTime(scene.view, cue.end_ms) - left;
    if (left + width < 0 || left > scene.view.widthPx) continue;
    ctx.fillStyle = waveformColors.cueFill;
    ctx.fillRect(left, top, width, cueBandHeightPx);
    ctx.fillStyle = waveformColors.cueEdge;
    ctx.fillRect(left, top, 1, cueBandHeightPx);
  }
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  scene: WaveformScene,
  segment: FlashcardSegment,
): void {
  const left = xAtTime(scene.view, segment.startMs);
  const right = xAtTime(scene.view, segment.endMs);
  if (right < 0 || left > scene.view.widthPx) return;
  ctx.fillStyle = waveformColors.segmentFill;
  ctx.fillRect(left, 0, right - left, scene.heightPx);
  ctx.fillStyle = waveformColors.segmentEdge;
  ctx.fillRect(left - 1, 0, 2, scene.heightPx);
  ctx.fillRect(right - 1, 0, 2, scene.heightPx);
  drawScreenshotMarker(ctx, xAtTime(scene.view, segment.screenshotMs));
}

/** A small triangle hanging from the top edge. */
function drawScreenshotMarker(ctx: CanvasRenderingContext2D, x: number): void {
  ctx.fillStyle = waveformColors.screenshotMarker;
  ctx.beginPath();
  ctx.moveTo(x - 6, 0);
  ctx.lineTo(x + 6, 0);
  ctx.lineTo(x, screenshotMarkerHeightPx);
  ctx.closePath();
  ctx.fill();
}

function drawPlayhead(
  ctx: CanvasRenderingContext2D,
  scene: WaveformScene,
): void {
  const x = Math.round(xAtTime(scene.view, scene.currentTimeMs));
  ctx.fillStyle = waveformColors.playhead;
  ctx.fillRect(x - 0.5, 0, 1.5, scene.heightPx);
}
