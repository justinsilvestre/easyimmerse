import type { ReviewSync } from "@easyimmerse/state";
import { Check, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../components/common/Button.tsx";
import { nextReviewPhrase } from "../../lib/formatting/nextReviewPhrase.ts";
import { pluralize } from "../../lib/formatting/pluralize.ts";
import { Count } from "./Count.tsx";
import { FlashcardsColumns } from "./FlashcardsColumns.tsx";
import { QueueSummary } from "./QueueSummary.tsx";

/**
 * Shows the review in easyImmerse while it is how the flashcards are used: what waits to be reviewed today,
 * with a `preview` of the front of the next card, and the button that starts the review.
 * Once the day's limit of reviews holds the rest back, it says so and offers to review more, as the end of a session does.
 * Once nothing is left for today, it says so in place of the button, with when the next review falls due.
 */
export function ReviewChannel({
  review,
  preview,
  onStartReview,
  onReviewMore,
}: {
  review: ReviewSync;
  /** The front of the card the review would show first, or null when nothing waits. */
  preview: ReactNode;
  onStartReview: () => void;
  onReviewMore: (reviewCount: number) => void;
}) {
  return (
    <FlashcardsColumns
      queue={<QueueSummary summary={summaryOf(review)} preview={preview} />}
      action={actionOf(review, onStartReview, onReviewMore)}
    >
      {null}
    </FlashcardsColumns>
  );
}

function actionOf(
  { dueCount, newCount, moreReviewCount }: ReviewSync,
  onStartReview: () => void,
  onReviewMore: (reviewCount: number) => void,
) {
  const waitingCount = dueCount + newCount;
  if (waitingCount > 0)
    return (
      <Button variant="primary" onClick={onStartReview}>
        <GraduationCap className="size-4" aria-hidden />
        {dueCount > 0
          ? `Review ${pluralize(waitingCount, "card")}`
          : `Learn ${pluralize(newCount, "new card")}`}
      </Button>
    );
  if (moreReviewCount > 0)
    return (
      <Button variant="secondary" onClick={() => onReviewMore(moreReviewCount)}>
        <GraduationCap className="size-4" aria-hidden />
        Review {moreReviewCount} more now
      </Button>
    );
  return null;
}

/** Counts what waits to be reviewed today, or says that the day's limit holds reviews back, or when the next review falls due. */
function summaryOf({
  dueCount,
  newCount,
  heldBackCount,
  nextDueAtMs,
}: ReviewSync) {
  const newPart = newCount > 0 && <Count>{newCount} new</Count>;
  const heldBackPart = (text: string) =>
    heldBackCount > 0 && <span className="text-fg-muted">{text}</span>;
  if (dueCount > 0)
    return (
      <span className="flex flex-col gap-0.5">
        <span>
          <Count>{dueCount} to review</Count>
          {newPart && <> · {newPart}</>}
        </span>
        {heldBackPart(
          `${pluralize(heldBackCount, "more card")} due today, but saved for later to respect the daily limit`,
        )}
      </span>
    );
  if (newCount > 0) return <>All reviews done · {newPart}</>;
  if (heldBackCount > 0)
    return (
      <span className="flex flex-col gap-0.5">
        <Count>Daily limit reached</Count>
        {heldBackPart(`${pluralize(heldBackCount, "more review")} due`)}
      </span>
    );
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="flex items-center gap-1.5">
        <Check className="size-4 text-success-fg" aria-hidden />
        <Count>All caught up</Count>
      </span>
      {nextDueAtMs !== null && (
        <span className="text-fg-muted">
          See you {nextReviewPhrase(nextDueAtMs)} for your next review
        </span>
      )}
    </span>
  );
}
