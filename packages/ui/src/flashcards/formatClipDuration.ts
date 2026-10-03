import type { AudioClip } from "./flashcardFields.ts";

/** Formats a clip's length as seconds with one decimal, for example `1.3 s`. */
export function formatClipDuration(clip: AudioClip): string {
  return `${((clip.endMs - clip.startMs) / 1000).toFixed(1)} s`;
}
