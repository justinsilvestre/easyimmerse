import { useEffect, useId, useRef } from "react";
import { Button } from "./Button.tsx";

/** Asks the user to confirm removing a media file. Takes focus when shown, and Escape cancels. */
export function MediaListRemovalConfirmation({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const messageId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);
  return (
    <div
      role="alertdialog"
      aria-labelledby={messageId}
      className="relative z-10 mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-line pt-3"
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
    >
      <p id={messageId} className="mr-auto text-sm text-fg-soft">
        Remove from this project? The file itself stays on your device.
      </p>
      <Button ref={cancelButtonRef} onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm}>
        Remove
      </Button>
    </div>
  );
}
