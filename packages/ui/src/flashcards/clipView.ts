import type { AudioClip } from "./flashcardFields.ts";

/** How far a handle moves for one arrow key press, and for one with Shift held. */
export const keyStepMs = 100;
export const largeKeyStepMs = 1000;

/** The shortest clip a handle can be dragged to. */
export const minClipMs = 200;

/** The span of the file shown around a clip: the clip itself with room on either side to extend it into. */
export function viewAroundClip(
  clip: AudioClip,
  durationMs: number,
): { startMs: number; endMs: number } {
  const margin = Math.max(1000, (clip.endMs - clip.startMs) / 2);
  return {
    startMs: Math.max(0, clip.startMs - margin),
    endMs: Math.min(durationMs, clip.endMs + margin),
  };
}

/** Moves the clip's start, keeping it within the file and before the end. */
export function moveClipStart(clip: AudioClip, startMs: number): AudioClip {
  return { ...clip, startMs: clamp(startMs, 0, clip.endMs - minClipMs) };
}

/** Moves the clip's end, keeping it after the start and within the file. */
export function moveClipEnd(
  clip: AudioClip,
  endMs: number,
  durationMs: number,
): AudioClip {
  return { ...clip, endMs: clamp(endMs, clip.startMs + minClipMs, durationMs) };
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
