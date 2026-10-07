import type { Cue } from "@easyimmerse/types";
import type { FlashcardSegment } from "./flashcardSegment.ts";
import { waveformColors } from "./waveformColors.ts";
import { cueBandHeightPx } from "./waveformCueHit.ts";
import type { WaveformView } from "./waveformGeometry.ts";
import { xAtTime } from "./waveformGeometry.ts";
import { screenshotMarkerHeightPx } from "./waveformHitTest.ts";

export type WaveformScene = {
  view: WaveformView;
  heightPx: number;
  currentTimeMs: number;
  cues: readonly Cue[];
  segments: readonly FlashcardSegment[];
};

/** Draws the cues, flashcard segments, and playhead on a clear canvas laid over the waveform's bars. */
export function drawWaveformOverlay(
  ctx: CanvasRenderingContext2D,
  scene: WaveformScene,
): void {
  drawCues(ctx, scene);
  for (const segment of scene.segments) drawSegment(ctx, scene, segment);
  drawPlayhead(ctx, scene);
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
