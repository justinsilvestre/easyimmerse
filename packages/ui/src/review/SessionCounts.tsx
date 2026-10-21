import type { ReviewSessionProgress } from "@easyimmerse/state";
import clsx from "clsx";

/** Says how many cards are left in the review session by kind: new, being learned, and due, coloured as Anki colours them. */
export function SessionCounts({
  progress,
}: {
  progress: ReviewSessionProgress;
}) {
  const { newCount, learningCount, dueCount } = progress;
  return (
    <p className="tabular-nums whitespace-nowrap">
      Cards left: <CountOf count={newCount} className="text-review-new" /> new ·{" "}
      <CountOf count={learningCount} className="text-review-learning" />{" "}
      learning · <CountOf count={dueCount} className="text-review-due" /> due
    </p>
  );
}

function CountOf({ count, className }: { count: number; className: string }) {
  return <span className={clsx("font-medium", className)}>{count}</span>;
}
