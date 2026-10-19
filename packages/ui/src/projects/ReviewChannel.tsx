import type { ReviewSync } from "@easyimmerse/state";
import { Check, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { pluralize } from "../components/pluralize.ts";
import { nextReviewPhrase } from "../review/nextReviewPhrase.ts";
import { Count } from "./Count.tsx";
import { FlashcardsColumns } from "./FlashcardsColumns.tsx";
import { QueueSummary } from "./QueueSummary.tsx";

/**
 * Shows the review in easyImmerse while it is how the flashcards are used: what waits to be reviewed today,
 * with a `preview` of the front of the next card, and the button that starts the review.
 * Once nothing is left for today, it says when the next review falls due.
 */
export function ReviewChannel({
  review,
  preview,
  onStartReview,
}: {
  review: ReviewSync;
  /** The front of the card the review would show first, or null when nothing waits. */
  preview: ReactNode;
  onStartReview: () => void;
}) {
  const { dueCount, newCount } = review;
  const waitingCount = dueCount + newCount;
  return (
    <FlashcardsColumns
      queue={<QueueSummary summary={summaryOf(review)} preview={preview} />}
      action={
        waitingCount > 0 ? (
          <Button variant="primary" onClick={onStartReview}>
            <GraduationCap className="size-4" aria-hidden />
            {dueCount > 0
              ? `Review ${pluralize(waitingCount, "card")}`
              : `Learn ${pluralize(newCount, "new card")}`}
          </Button>
        ) : (
          <p className="flex items-center gap-1.5 text-fg-muted">
            <Check className="size-4" aria-hidden />
            Done for today
          </p>
        )
      }
    >
      {null}
    </FlashcardsColumns>
  );
}

/** Counts what waits to be reviewed today, or says when the next review falls due. */
function summaryOf({ dueCount, newCount, nextDueAtMs }: ReviewSync) {
  const newPart = newCount > 0 && <Count>{newCount} new</Count>;
  if (dueCount > 0)
    return (
      <>
        <Count>{dueCount} to review</Count>
        {newPart && <> · {newPart}</>}
      </>
    );
  if (newCount > 0) return <>All reviews done · {newPart}</>;
  return (
    <span className="flex flex-col gap-0.5">
      <Count>All caught up</Count>
      {nextDueAtMs !== null && (
        <span className="text-fg-muted">
          Next review {nextReviewPhrase(nextDueAtMs)}
        </span>
      )}
    </span>
  );
}
