/**
 * Returns local time minus UTC, in minutes, at a moment on the user's device, as the review routes take it:
 * 120 in Central European Summer Time, -300 in Eastern Standard Time.
 */
export function utcOffsetMinOf(date: Pick<Date, "getTimezoneOffset">): number {
  // `getTimezoneOffset` counts the other way, UTC minus local time. Subtracting from 0 gives 0 rather than -0 in UTC.
  return 0 - date.getTimezoneOffset();
}
