import type { ComponentProps } from "react";
import { RatingBar, type ReviewGrade } from "../review/RatingBar.tsx";
import {
  ReviewControlRow,
  type ReviewSessionProgress,
} from "../review/ReviewControlRow.tsx";
import { ReviewSession } from "../review/ReviewSession.tsx";

/**
 * The review of a project's flashcards, with nothing of the app's frame: a slim row of controls at the top,
 * the card in between, which alone scrolls when it does not fit, and the rating bar at the bottom while a card is shown.
 * On a phone with a notch or a home indicator, the rows keep clear of them.
 */
export function ReviewScreen({
  projectName,
  progress,
  intervals,
  onEditFlashcard,
  onDeleteFlashcard,
  ...session
}: ComponentProps<typeof ReviewSession> & {
  projectName: string;
  progress: ReviewSessionProgress;
  /** The time until the next review each grade would schedule, already written out. */
  intervals: Record<ReviewGrade, string>;
  onEditFlashcard: () => void;
  onDeleteFlashcard: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg">
      <ReviewControlRow
        projectName={projectName}
        progress={progress}
        canUndo={session.canUndo}
        hasCard={session.card !== null}
        onBack={session.onBack}
        onUndo={session.onUndo}
        onEditFlashcard={onEditFlashcard}
        onDeleteFlashcard={onDeleteFlashcard}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <ReviewSession {...session} />
      </main>
      {session.card && (
        <RatingBar
          stage={session.stage}
          buttons={session.buttons}
          intervals={intervals}
          onShowAnswer={session.onShowAnswer}
          onRate={session.onRate}
        />
      )}
    </div>
  );
}
