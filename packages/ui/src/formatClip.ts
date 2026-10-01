import type { TimeRange } from "@easyimmerse/types";

/** Formats a span of media time as `m:ss.t – m:ss.t`. */
export function formatClip(clip: TimeRange): string {
  return `${formatMediaTime(clip.start_ms)} – ${formatMediaTime(clip.end_ms)}`;
}

function formatMediaTime(ms: number): string {
  const tenths = Math.round(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = (tenths % 600) / 10;
  return `${minutes}:${seconds.toFixed(1).padStart(4, "0")}`;
}
