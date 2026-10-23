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
  isFromLibrary = false,
  onBury,
  onSuspend,
  onDeleteFlashcard,
  onToggleIntervals,
  ...session
}: ComponentProps<typeof ReviewSession> & {
  projectName: string;
  progress: ReviewSessionProgress;
  /** The time until the next review each grade would schedule, already written out, or null while the user hides them. */
  intervals: Record<ReviewGrade, string> | null;
  buttons: ReviewButtons;
  canUndo: boolean;
  onShowAnswer: () => void;
  onRate: (grade: ReviewGrade) => void;
  onUndo: () => void;
  /** Opens the card in the editor. Null leaves the item out of the More menu. */
  onEditFlashcard: (() => void) | null;
  /** Whether the card was made from the library, which opens read-only rather than in the editor. */
  isFromLibrary?: boolean;
  onBury: () => void;
  onSuspend: () => void;
  onDeleteFlashcard: () => void;
  onToggleIntervals: () => void;
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
        isFromLibrary={isFromLibrary}
        onBury={onBury}
        onSuspend={onSuspend}
        onDeleteFlashcard={onDeleteFlashcard}
        areIntervalsShown={intervals !== null}
        onToggleIntervals={onToggleIntervals}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <ReviewSession {...session} onSuspend={onSuspend} />
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
