import type { ReviewSessionProgress } from "@easyimmerse/state";
import clsx from "clsx";
import { ArrowLeft, Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import type { MenuItem } from "../components/MenuItemButton.tsx";

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
  /** Opens the card in the editor. Null leaves the item out, as for a card whose media file is gone. */
  onEditFlashcard: (() => void) | null;
  onDeleteFlashcard: () => void;
}) {
  const editItem: MenuItem[] = onEditFlashcard
    ? [
        {
          label: "Edit flashcard",
          icon: <Pencil className="size-4" aria-hidden />,
          onSelect: onEditFlashcard,
        },
      ]
    : [];
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3">
      <IconButton label={`Back to ${projectName}`} onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden />
      </IconButton>
      <p className="text-xs text-fg-muted tabular-nums">
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
            ...editItem,
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
  return <span className={clsx("font-medium", className)}>{count}</span>;
}
