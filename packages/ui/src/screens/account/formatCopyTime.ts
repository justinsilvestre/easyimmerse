import { formatRelativeDate } from "../../lib/formatting/formatRelativeDate.ts";
import { formatSinceTime } from "../../lib/formatting/formatSinceTime.ts";

/** Names when a copy was made: its time of day when it is today, and otherwise its day relative to now. */
export function formatCopyTime(
  timestampMs: number,
  now: number = Date.now(),
): string {
  const day = formatRelativeDate(timestampMs, now);
  return day === "today"
    ? `today at ${formatSinceTime(timestampMs, now)}`
    : day;
}
