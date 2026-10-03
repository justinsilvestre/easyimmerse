export const dayMs = 24 * 60 * 60 * 1000;

/**
 * Describes a past date relative to now, such as `today`, `yesterday`, or `3 days ago`, switching to the date after a month.
 * Days are calendar days in the local time zone.
 */
export function formatRelativeDate(
  iso: string,
  now: number = Date.now(),
): string {
  const days = countCalendarDays(new Date(iso), new Date(now));
  if (days <= 0) return "today";
  if (days > 30)
    return new Date(iso).toLocaleDateString("en", { dateStyle: "medium" });
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    -days,
    "day",
  );
}

function countCalendarDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / dayMs);
}

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}
