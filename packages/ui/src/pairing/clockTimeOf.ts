/**
 * Formats a moment, in milliseconds since the Unix epoch, as the time of day in hours and minutes.
 * It uses the person's own locale and time zone unless others are given.
 */
export function clockTimeOf(ms: number, locale?: string, timeZone?: string) {
  return new Date(ms).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}
