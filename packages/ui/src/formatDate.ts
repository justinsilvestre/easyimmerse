/** Formats an RFC 3339 timestamp as a date such as "Sep 28, 2026", in the user's locale unless another is given. */
export function formatDate(timestamp: string, locale?: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return formatter.format(new Date(timestamp));
}
