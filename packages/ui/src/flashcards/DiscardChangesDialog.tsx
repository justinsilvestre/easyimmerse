import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";

/** Asks before the flashcard being edited is replaced by another, which would lose the changes made to it. */
export function DiscardChangesDialog({
  onDiscard,
  onKeepEditing,
}: {
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  return (
    <Dialog
      title="Discard your changes to this flashcard?"
      description="The flashcard you are editing has changes that are not saved. Opening another flashcard discards them."
      onClose={onKeepEditing}
      footer={
        <>
          <Button onClick={onKeepEditing}>Keep editing</Button>
          <Button variant="danger" onClick={onDiscard}>
            Discard changes
          </Button>
        </>
      }
    />
  );
}
