import type { FooterActivity } from "@easyimmerse/state";
import { pluralize } from "../lib/formatting/pluralize.ts";

/** Counts the activities in a few words for the footer's summary button, such as "2 tasks running" or "1 failed, 2 running". */
export function summarizeFooterActivities(
  activities: readonly FooterActivity[],
): string {
  const failedCount = activities.filter((a) => a.status === "failed").length;
  const runningCount = activities.length - failedCount;
  if (failedCount === 0) return `${pluralize(runningCount, "task")} running`;
  if (runningCount === 0) return `${pluralize(failedCount, "task")} failed`;
  return `${failedCount} failed, ${runningCount} running`;
}

/** The mean percentage of the running activities that know theirs, for one bar standing for all of them; null while none knows. */
export function meanPercentOf(
  activities: readonly FooterActivity[],
): number | null {
  const percents = activities.flatMap((a) =>
    a.status === "running" && a.percent !== null ? [a.percent] : [],
  );
  if (percents.length === 0) return null;
  const sum = percents.reduce((total, percent) => total + percent, 0);
  return Math.round(sum / percents.length);
}

/** Puts the activities' labels into sentences for a screen reader, leaving out the percentages, which change too often to announce. */
export function describeFooterActivities(
  activities: readonly FooterActivity[],
): string {
  return activities.map((a) => `${a.label}.`).join(" ");
}
