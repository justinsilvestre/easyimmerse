import type { AudioClip } from "@easyimmerse/types";

/** How far a handle moves for one arrow key press, and for one with Shift held. */
export const keyStepMs = 100;
export const largeKeyStepMs = 1000;

/** The shortest clip a handle can be dragged to. */
export const minClipMs = 200;

/** How far past an edge a handle is held for the view to widen at full speed, and that speed in view spans per second. */
export const fullSpeedOvershootPx = 60;
export const fullSpeedSpansPerSecond = 2;

/** The part of the file on view, from one time to another. */
export type WaveformView = { startMs: number; endMs: number };

/** Where the waveform sits on the screen, in client pixels. */
export type WaveformFrame = { left: number; width: number };

/** The span of the file shown around a clip: the clip itself with room on either side to extend it into. */
export function viewAroundClip(
  clip: AudioClip,
  durationMs: number,
): WaveformView {
  const margin = Math.max(1000, (clip.end_ms - clip.start_ms) / 2);
  return {
    startMs: Math.max(0, clip.start_ms - margin),
    endMs: Math.min(durationMs, clip.end_ms + margin),
  };
}

/** Widens the view so that the time is on it, when a handle is dragged past its edge. */
export function viewIncluding(
  view: WaveformView,
  ms: number,
  durationMs: number,
): WaveformView {
  if (ms < view.startMs) return { ...view, startMs: Math.max(0, ms - 500) };
  if (ms > view.endMs)
    return { ...view, endMs: Math.min(durationMs, ms + 500) };
  return view;
}

/** Widens the view so that every one of the times is on it. */
export function viewIncludingAll(
  view: WaveformView,
  times: readonly number[],
  durationMs: number,
): WaveformView {
  return times.reduce(
    (widened, ms) => viewIncluding(widened, ms, durationMs),
    view,
  );
}

/** The time under a horizontal position on the waveform, which may lie beyond the view. */
export function timeAtX(
  frame: WaveformFrame,
  view: WaveformView,
  x: number,
): number {
  return (
    view.startMs +
    ((x - frame.left) / frame.width) * (view.endMs - view.startMs)
  );
}

/** The horizontal position of a time on the waveform. */
export function xOfTime(
  frame: WaveformFrame,
  view: WaveformView,
  ms: number,
): number {
  return (
    frame.left +
    ((ms - view.startMs) / (view.endMs - view.startMs)) * frame.width
  );
}

/** How far a position lies before the waveform's left edge (negative) or after its right edge (positive). */
export function overshootPx(frame: WaveformFrame, x: number): number {
  return (
    Math.min(x - frame.left, 0) + Math.max(x - frame.left - frame.width, 0)
  );
}

/**
 * Widens the view on the side a handle is held past, faster the further past it is held,
 * for the time it has been held there.
 */
export function viewWidened(
  view: WaveformView,
  overshoot: number,
  elapsedMs: number,
  durationMs: number,
): WaveformView {
  const speed =
    (Math.min(Math.abs(overshoot), fullSpeedOvershootPx) /
      fullSpeedOvershootPx) *
    fullSpeedSpansPerSecond;
  const growthMs = (view.endMs - view.startMs) * speed * (elapsedMs / 1000);
  if (overshoot < 0)
    return { ...view, startMs: Math.max(0, view.startMs - growthMs) };
  if (overshoot > 0)
    return { ...view, endMs: Math.min(durationMs, view.endMs + growthMs) };
  return view;
}

/**
 * Where a dragged handle goes for its position on the screen. On the waveform it is the time under that position.
 * Held past an edge, the handle stays at the edge while the view widens for the time elapsed,
 * though never further than the handle is allowed to go.
 */
export function draggedHandle({
  view,
  frame,
  x,
  elapsedMs,
  durationMs,
  constrain,
}: {
  view: WaveformView;
  frame: WaveformFrame;
  x: number;
  elapsedMs: number;
  durationMs: number;
  constrain: (ms: number) => number;
}): { view: WaveformView; ms: number } {
  const overshoot = overshootPx(frame, x);
  if (overshoot === 0) return { view, ms: constrain(timeAtX(frame, view, x)) };
  const widened = viewWidened(view, overshoot, elapsedMs, durationMs);
  if (overshoot < 0) {
    const ms = constrain(widened.startMs);
    return { view: { ...view, startMs: Math.min(view.startMs, ms) }, ms };
  }
  const ms = constrain(widened.endMs);
  return { view: { ...view, endMs: Math.max(view.endMs, ms) }, ms };
}

/** The times covered by the whole peaks that are drawn for the view, which may reach a little past it on either side. */
export function peakSpan(
  peakCount: number,
  durationMs: number,
  view: WaveformView,
): WaveformView {
  if (peakCount === 0) return view;
  const peakMs = durationMs / peakCount;
  return {
    startMs: Math.floor((peakCount * view.startMs) / durationMs) * peakMs,
    endMs: Math.ceil((peakCount * view.endMs) / durationMs) * peakMs,
  };
}

/** Moves the clip's start, keeping it within the file and before the end. */
export function moveClipStart(clip: AudioClip, startMs: number): AudioClip {
  return { ...clip, start_ms: clamp(startMs, 0, clip.end_ms - minClipMs) };
}

/** Moves the clip's end, keeping it after the start and within the file. */
export function moveClipEnd(
  clip: AudioClip,
  endMs: number,
  durationMs: number,
): AudioClip {
  return {
    ...clip,
    end_ms: clamp(endMs, clip.start_ms + minClipMs, durationMs),
  };
}

/** The time an arrow key moves a handle to, or null for a key that is not an arrow. */
export function timeAfterKey(
  key: string,
  shiftKey: boolean,
  fromMs: number,
): number | null {
  const step = shiftKey ? largeKeyStepMs : keyStepMs;
  if (key === "ArrowLeft") return fromMs - step;
  if (key === "ArrowRight") return fromMs + step;
  return null;
}

/** Keeps a value between a minimum and a maximum. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
