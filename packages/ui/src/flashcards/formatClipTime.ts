import { formatTimestamp } from "../media/formatTimestamp.ts";

/** Formats a clip boundary as `m:ss.t`, with tenths of a second so that small moves show. */
export function formatClipTime(ms: number): string {
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100);
  return `${formatTimestamp(ms)}.${tenths}`;
}

/** Formats how long a clip lasts in seconds with one decimal, such as `1.3 s`. */
export function formatClipDuration(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)} s`;
}
