import { pluralize } from "../components/pluralize.ts";

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;
const monthDays = 365 / 12;

/**
 * Writes the time until a card's next review in the largest unit that reads naturally,
 * such as `10 min`, `1 day`, `2 weeks`, `3 months` or `1.2 years`.
 */
export function formatInterval(intervalMs: number): string {
  const minutes = Math.max(1, Math.round(intervalMs / minuteMs));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(intervalMs / hourMs);
  if (hours < 24) return pluralize(hours, "hour");
  const days = Math.round(intervalMs / dayMs);
  if (days < 14) return pluralize(days, "day");
  if (days < 30) return pluralize(Math.round(days / 7), "week");
  const months = Math.round(days / monthDays);
  if (months < 12) return pluralize(months, "month");
  return pluralize(Math.round((days / 365) * 10) / 10, "year");
}
