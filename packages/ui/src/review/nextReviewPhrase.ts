const dayMs = 24 * 60 * 60 * 1000;

/** The hour a review day starts, as in Anki, so that a late-night session still counts as the evening's. */
const dayStartHour = 4;

/**
 * Says when the next review falls due, to follow "Next review": `tomorrow`, `in 3 days`, or `at 16:40` later today.
 * A day ends at 4 a.m. local time.
 */
export function nextReviewPhrase(
  dueAtMs: number,
  now: number = Date.now(),
): string {
  const days = reviewDayOf(dueAtMs) - reviewDayOf(now);
  if (days <= 0) return `at ${timeOfDay(dueAtMs)}`;
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Writes the time of day in the user's locale, such as `16:40` or `4:40 PM`. */
export function timeOfDay(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString(undefined, {
    timeStyle: "short",
  });
}

/** Numbers the review day of a moment, counting calendar days in the local time zone, so that a change of daylight saving time does not skew it. */
function reviewDayOf(timestampMs: number): number {
  const date = new Date(timestampMs);
  date.setHours(date.getHours() - dayStartHour);
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMs,
  );
}
