import { CloudOff, Save } from "lucide-react";
import { Button } from "../components/Button.tsx";

/** Reminds the user that recent flashcards are unsaved, or saved only on this device. Renders nothing when neither applies. */
export function UnsavedWorkBanner({
  hasUnsavedChanges,
  isBackedUp,
  onSave,
  onLogIn,
}: {
  hasUnsavedChanges: boolean;
  isBackedUp: boolean;
  onSave: () => void;
  onLogIn: () => void;
}) {
  if (!hasUnsavedChanges && isBackedUp) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-sm text-warning-fg"
    >
      {hasUnsavedChanges && (
        <span className="flex items-center gap-2">
          <Save className="size-4 shrink-0" aria-hidden />
          Your latest flashcards are not saved yet.
          <Button size="sm" onClick={onSave}>
            Save now
          </Button>
        </span>
      )}
      {!isBackedUp && (
        <span className="flex items-center gap-2">
          <CloudOff className="size-4 shrink-0" aria-hidden />
          Your work is only on this device.
          <Button size="sm" onClick={onLogIn}>
            Log in to back it up
          </Button>
        </span>
      )}
    </div>
  );
}
