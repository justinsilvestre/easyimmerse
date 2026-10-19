import clsx from "clsx";
import { ArrowLeft, Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";

/** How far a review session has come, and what is left in it by kind of card. */
export type ReviewSessionProgress = {
  finished: number;
  total: number;
  newCount: number;
  /** The cards still being learned, which come back within the session until they graduate. */
  learningCount: number;
  dueCount: number;
};

/**
 * The slim row at the top of the review screen: the way back to the project, the cards left by kind,
 * coloured as Anki colours them, and Undo with the card's actions.
 * Undo stays in place while unavailable so that the row does not shift.
 */
export function ReviewControlRow({
  projectName,
  progress,
  canUndo,
  hasCard,
  onBack,
  onUndo,
  onEditFlashcard,
  onDeleteFlashcard,
}: {
  projectName: string;
  progress: ReviewSessionProgress;
  canUndo: boolean;
  /** Whether a card is shown, which the card's actions in the More menu need. */
  hasCard: boolean;
  onBack: () => void;
  onUndo: () => void;
  onEditFlashcard: () => void;
  onDeleteFlashcard: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1">
      <IconButton label={`Back to ${projectName}`} onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
      </IconButton>
      <p className="text-xs text-fg-muted">
        <CountOf count={progress.newCount} className="text-review-new" /> new ·{" "}
        <CountOf
          count={progress.learningCount}
          className="text-review-learning"
        />{" "}
        learning ·{" "}
        <CountOf count={progress.dueCount} className="text-review-due" /> due
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="subtle"
          disabled={!canUndo}
          aria-keyshortcuts="Z"
          onClick={onUndo}
        >
          <Undo2 className="size-4" aria-hidden />
          Undo
        </Button>
        <MenuButton
          label="More"
          isUnavailable={!hasCard}
          items={[
            {
              label: "Edit flashcard",
              icon: <Pencil className="size-4" aria-hidden />,
              onSelect: onEditFlashcard,
            },
            {
              label: "Delete flashcard",
              icon: <Trash2 className="size-4" aria-hidden />,
              isDestructive: true,
              onSelect: onDeleteFlashcard,
            },
          ]}
        />
      </div>
    </div>
  );
}

function CountOf({ count, className }: { count: number; className: string }) {
  return (
    <span className={clsx("font-semibold tabular-nums", className)}>
      {count}
    </span>
  );
}
