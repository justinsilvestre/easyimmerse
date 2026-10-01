import { useEffect, useRef } from "react";
import { Button } from "./Button.tsx";

/** Asks the user to confirm removing a media file. Takes focus when shown, and Escape cancels. */
export function MediaListRemovalConfirmation({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelButtonRef.current?.focus(), []);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape is handled for the buttons inside, which receive the key events.
    <div
      className="relative z-10 mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-gray-200 pt-3"
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
    >
      <p className="mr-auto text-sm text-gray-700">
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
