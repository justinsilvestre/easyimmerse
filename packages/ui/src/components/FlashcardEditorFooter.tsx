import { useState } from "react";
import { Button } from "./Button.tsx";

/** Holds the dialog's Save submit button, Cancel, and, for a saved card, a Delete that asks for confirmation first. */
export function FlashcardEditorFooter({
  isSaved,
  onDelete,
  onCancel,
}: {
  isSaved: boolean;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  if (isConfirmingDelete)
    return (
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
        <p role="alert" className="mr-auto text-sm">
          Delete this flashcard?
        </p>
        <Button onClick={() => setIsConfirmingDelete(false)}>Keep</Button>
        <Button variant="danger" onClick={onDelete}>
          Delete flashcard
        </Button>
      </footer>
    );
  return (
    <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
      {isSaved && (
        <Button
          variant="subtle"
          className="mr-auto"
          onClick={() => setIsConfirmingDelete(true)}
        >
          Delete
        </Button>
      )}
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="primary" type="submit">
        Save
      </Button>
    </footer>
  );
}
