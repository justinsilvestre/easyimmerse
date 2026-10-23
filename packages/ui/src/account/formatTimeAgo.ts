import { formatRelativeDate } from "../projects/formatRelativeDate.ts";

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/** Names a past moment by how long ago it was, such as `just now`, `2 minutes ago` or `3 hours ago`, and by its day once it is a day or more ago. */
export function formatTimeAgo(
  timestampMs: number,
  now: number = Date.now(),
): string {
  const minutes = Math.floor((now - timestampMs) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return relativeTime.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relativeTime.format(-hours, "hour");
  return formatRelativeDate(timestampMs, now);
}
