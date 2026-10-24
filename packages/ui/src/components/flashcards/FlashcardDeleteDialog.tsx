import type { AnkiFateOfDeletion } from "@easyimmerse/state";
import { Button } from "../common/Button.tsx";
import { ModalDialog } from "../common/ModalDialog.tsx";

/**
 * Asks whether to delete a flashcard, naming its word and telling what becomes of it in Anki, when that is known.
 * Cancel has focus, so that Enter does not delete.
 */
export function FlashcardDeleteDialog({
  word,
  ankiFate,
  onCancel,
  onDelete,
}: {
  word: string;
  /** What deleting the flashcard does to its note in Anki, or null when that is not known. */
  ankiFate: AnkiFateOfDeletion | null;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <ModalDialog
      title="Delete this flashcard?"
      description={deletionDescription(word, ankiFate)}
      onCancel={onCancel}
      footer={
        <>
          <Button autoFocus onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </>
      }
    />
  );
}

/** What each fate of the flashcard's note in Anki adds to the description. */
const noteLines = {
  none: "",
  deletedByAnkiConnect: "Its note is deleted from Anki too.",
  deletedByAnkiConnectLater:
    "Its note is deleted from Anki the next time easyImmerse reaches Anki.",
  anyDeletedByAnkiConnect:
    "If you imported it into Anki from a package, its note there is deleted too.",
  anyDeletedByAnkiConnectLater:
    "If you imported it into Anki from a package, its note there is deleted the next time easyImmerse reaches Anki.",
  staysListed:
    "Its corresponding Anki note stays in Anki until you delete it there or turn AnkiConnect on. A record of deleted flashcards is kept for your reference in the project screen.",
  stays: "Its corresponding Anki note stays in Anki until you delete it there.",
} satisfies Record<AnkiFateOfDeletion["note"], string>;

/** Describes what deleting the flashcard for the word does, in the project and in Anki. */
export function deletionDescription(
  word: string,
  ankiFate: AnkiFateOfDeletion | null,
): string {
  const lines = [
    `The flashcard for “${word}” is deleted from the project. The deletion cannot be undone.`,
  ];
  if (ankiFate !== null) {
    lines.push(noteLines[ankiFate.note]);
    if (ankiFate.wasPackaged)
      lines.push(
        "Importing a package made before now that holds it would bring it back.",
      );
  }
  return lines.filter((line) => line !== "").join(" ");
}
