/** Names a past moment for "since …": its time of day when it is today, and otherwise its date and time. */
export function formatSinceTime(
  timestampMs: number,
  now: number = Date.now(),
): string {
  const moment = new Date(timestampMs);
  return moment.toDateString() === new Date(now).toDateString()
    ? moment.toLocaleTimeString("en", { timeStyle: "short" })
    : moment.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}
