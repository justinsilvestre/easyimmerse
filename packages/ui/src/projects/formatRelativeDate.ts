const dayMs = 24 * 60 * 60 * 1000;

/** Describes a past date relative to now, such as `today`, `yesterday`, or `3 days ago`, switching to the date after a month. */
export function formatRelativeDate(
  iso: string,
  now: number = Date.now(),
): string {
  const days = Math.floor((now - Date.parse(iso)) / dayMs);
  if (days <= 0) return "today";
  if (days > 30)
    return new Date(iso).toLocaleDateString("en", { dateStyle: "medium" });
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    -days,
    "day",
  );
}
