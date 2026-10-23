import type { ReviewSessionProgress } from "@easyimmerse/state";
import {
  ArrowLeft,
  CalendarClock,
  CirclePause,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "../components/Button.tsx";
import { IconButton } from "../components/IconButton.tsx";
import { MenuButton } from "../components/MenuButton.tsx";
import type { MenuItem } from "../components/MenuItemButton.tsx";
import { SessionCounts } from "./SessionCounts.tsx";

/**
 * The slim row at the top of the review screen: the way back to the project, and Undo with the More menu,
 * which tells how many cards are left by kind and holds the card's actions.
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
  isFromLibrary = false,
  onBury,
  onSuspend,
  onDeleteFlashcard,
  areIntervalsShown,
  onToggleIntervals,
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
  /** Whether the card was made from the library, which opens read-only, so that its item says "Open flashcard". */
  isFromLibrary?: boolean;
  /** Hides the card until the next day begins. */
  onBury: () => void;
  /** Leaves the card out of the review until the user unsuspends it in the editor. */
  onSuspend: () => void;
  onDeleteFlashcard: () => void;
  /** Whether the answer buttons say when each answer would bring the card back. */
  areIntervalsShown: boolean;
  onToggleIntervals: () => void;
}) {
  const editItem: MenuItem[] = onEditFlashcard
    ? [
        {
          label: isFromLibrary ? "Open flashcard" : "Edit flashcard",
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
          heading={<SessionCounts progress={progress} />}
          items={[
            ...editItem,
            {
              label: "Bury until tomorrow",
              icon: <CalendarClock className="size-4" aria-hidden />,
              onSelect: onBury,
            },
            {
              label: "Suspend",
              icon: <CirclePause className="size-4" aria-hidden />,
              onSelect: onSuspend,
            },
            {
              label: "Show intervals on answer buttons",
              isChecked: areIntervalsShown,
              onSelect: onToggleIntervals,
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
