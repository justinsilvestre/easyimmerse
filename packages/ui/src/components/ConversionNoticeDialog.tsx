import { Button } from "./Button.tsx";
import { ModalDialog } from "./ModalDialog.tsx";

/** Tells the user that a file is about to be converted as it plays, with a "Don't show this again" box. */
export function ConversionNoticeDialog({
  dismissForGood,
  onDismissForGoodToggle,
  onPlay,
  onCancel,
}: {
  dismissForGood: boolean;
  onDismissForGoodToggle: () => void;
  onPlay: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalDialog
      title="This file will be converted as it plays"
      onCancel={onCancel}
      footer={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" autoFocus onClick={onPlay}>
            Play
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-soft">
        Your system cannot play this format directly, so easyImmerse converts it
        while you watch. You can start right away and jump to any point.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={dismissForGood}
          onChange={onDismissForGoodToggle}
        />
        Don't show this again
      </label>
    </ModalDialog>
  );
}
