import type { ReviewSessionProgress } from "@easyimmerse/state";
import clsx from "clsx";
import { useId } from "react";
import { Button } from "../components/Button.tsx";

/**
 * Says how many cards are left in the review session.
 * Pressing it shows how many of them are new, being learned, and due, coloured as Anki colours them.
 * The breakdown closes on Escape or on a press anywhere else.
 */
export function CardsLeftButton({
  progress,
}: {
  progress: ReviewSessionProgress;
}) {
  const popoverId = useId();
  const { newCount, learningCount, dueCount } = progress;
  return (
    <>
      <Button
        variant="subtle"
        size="sm"
        popoverTarget={popoverId}
        className="tabular-nums"
      >
        {newCount + learningCount + dueCount} left
      </Button>
      <div
        id={popoverId}
        popover="auto"
        className="inset-x-0 top-[calc(env(safe-area-inset-top)+2.75rem)] mx-auto mt-0 rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg-muted tabular-nums shadow-lg"
      >
        <CountOf count={newCount} className="text-review-new" /> new ·{" "}
        <CountOf count={learningCount} className="text-review-learning" />{" "}
        learning · <CountOf count={dueCount} className="text-review-due" /> due
      </div>
    </>
  );
}

function CountOf({ count, className }: { count: number; className: string }) {
  return <span className={clsx("font-medium", className)}>{count}</span>;
}
