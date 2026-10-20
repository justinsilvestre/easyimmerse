import type { ReviewSessionProgress } from "@easyimmerse/state";
import type { ComponentProps } from "react";
import {
  RatingBar,
  type ReviewButtons,
  type ReviewGrade,
} from "../review/RatingBar.tsx";
import { ReviewControlRow } from "../review/ReviewControlRow.tsx";
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
  buttons,
  canUndo,
  onShowAnswer,
  onRate,
  onUndo,
  onEditFlashcard,
  onBury,
  onSuspend,
  onDeleteFlashcard,
  ...session
}: ComponentProps<typeof ReviewSession> & {
  projectName: string;
  progress: ReviewSessionProgress;
  /** The time until the next review each grade would schedule, already written out. */
  intervals: Record<ReviewGrade, string>;
  buttons: ReviewButtons;
  canUndo: boolean;
  onShowAnswer: () => void;
  onRate: (grade: ReviewGrade) => void;
  onUndo: () => void;
  /** Opens the card in the editor. Null leaves the item out of the More menu. */
  onEditFlashcard: (() => void) | null;
  onBury: () => void;
  onSuspend: () => void;
  onDeleteFlashcard: () => void;
}) {
  return (
    <div className="flex h-dvh flex-col bg-canvas pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-fg">
      <ReviewControlRow
        projectName={projectName}
        progress={progress}
        canUndo={canUndo}
        hasCard={session.card !== null}
        onBack={session.onBack}
        onUndo={onUndo}
        onEditFlashcard={onEditFlashcard}
        onBury={onBury}
        onSuspend={onSuspend}
        onDeleteFlashcard={onDeleteFlashcard}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <ReviewSession
          {...session}
          onEditFlashcard={onEditFlashcard}
          onSuspend={onSuspend}
        />
      </main>
      {session.card && (
        <RatingBar
          stage={session.stage}
          buttons={buttons}
          intervals={intervals}
          onShowAnswer={onShowAnswer}
          onRate={onRate}
        />
      )}
    </div>
  );
}
