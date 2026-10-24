import type { Flashcard } from "@easyimmerse/types";
import { CirclePause, CirclePlay, Trash2 } from "lucide-react";
import type { MenuItem } from "../../components/common/MenuItemButton.tsx";

/** What the user can do to a flashcard made from the library, which cannot be edited. */
type LibraryFlashcardHandlers = {
  onSuspend: (flashcard: Flashcard) => void;
  onUnsuspend: (flashcard: Flashcard) => void;
  /** Asks to delete the flashcard, which waits for confirmation. */
  onAskDelete: (flashcard: Flashcard) => void;
};

/**
 * Returns the menu of each flashcard made from the library, by the index of the cue it was made from:
 * "Suspend", or "Unsuspend" for a suspended flashcard, and "Delete flashcard".
 * Flashcards made elsewhere, and those made from no cue, have none.
 */
export function libraryFlashcardMenusOf(
  flashcards: readonly Flashcard[],
  handlers: LibraryFlashcardHandlers,
): ReadonlyMap<number, readonly MenuItem[]> {
  return new Map(
    flashcards.flatMap((flashcard) =>
      flashcard.is_from_library && flashcard.cue_index !== null
        ? [[flashcard.cue_index, menuOf(flashcard, handlers)] as const]
        : [],
    ),
  );
}

function menuOf(
  flashcard: Flashcard,
  { onSuspend, onUnsuspend, onAskDelete }: LibraryFlashcardHandlers,
): readonly MenuItem[] {
  return [
    flashcard.is_suspended
      ? {
          label: "Unsuspend",
          icon: <CirclePlay className="size-4" aria-hidden />,
          onSelect: () => onUnsuspend(flashcard),
        }
      : {
          label: "Suspend",
          icon: <CirclePause className="size-4" aria-hidden />,
          onSelect: () => onSuspend(flashcard),
        },
    {
      label: "Delete flashcard",
      icon: <Trash2 className="size-4" aria-hidden />,
      isDestructive: true,
      onSelect: () => onAskDelete(flashcard),
    },
  ];
}
