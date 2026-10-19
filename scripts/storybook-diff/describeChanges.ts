import type { ChangeKind } from "./classifyStories.ts";
import type { ComparisonReport } from "./compareCaptures.ts";

const kinds: ChangeKind[] = ["changed", "added", "removed", "errored"];

/** Sums up a report in one line, such as `3 changed, 1 added, 0 removed, 0 errored of 326 stories`. */
export function describeChanges(report: ComparisonReport): string {
  const counts = kinds.map(
    (kind) =>
      `${report.changes.filter((change) => change.kind === kind).length} ${kind}`,
  );
  return `${counts.join(", ")} of ${report.storyCount} stories`;
}
