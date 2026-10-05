import { Button } from "../components/Button.tsx";
import { ModalDialog } from "../components/ModalDialog.tsx";

/** Asks before a dictionary is removed, since its entries and files go with it. Cancel has the focus, so that Enter keeps the dictionary. */
export function RemoveDictionaryDialog({
  title,
  onRemove,
  onCancel,
}: {
  title: string;
  onRemove: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalDialog
      title={`Remove ${title}?`}
      description="Its entries, images and sounds are deleted from this device. The removal cannot be undone; to use the dictionary again, add it again."
      onCancel={onCancel}
      footer={
        <>
          <Button autoFocus onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onRemove}>
            Remove
          </Button>
        </>
      }
    />
  );
}
