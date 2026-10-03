import { formatTimestamp } from "../media/formatTimestamp.ts";

/** Formats a clip boundary as `m:ss.t`, with tenths of a second so that small moves show. */
export function formatClipTime(ms: number): string {
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100);
  return `${formatTimestamp(ms)}.${tenths}`;
}
