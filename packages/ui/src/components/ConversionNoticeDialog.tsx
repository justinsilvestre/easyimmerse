import { actions } from "@easyimmerse/state";
import { useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { Button } from "./Button.tsx";
import { DialogActions, ModalDialog } from "./ModalDialog.tsx";

/**
 * Tells the user, once, that a file is about to be converted as it plays.
 * Ticking "Don't show this again" and playing stores the `conversionNoticeDismissed` preference.
 */
export function ConversionNoticeDialog({
  onPlay,
  onCancel,
}: {
  onPlay: () => void;
  onCancel: () => void;
}) {
  const dispatch = useAppDispatch();
  const [dismissForGood, setDismissForGood] = useState(false);
  const play = () => {
    if (dismissForGood)
      dispatch(actions.preferenceSet("conversionNoticeDismissed", "true"));
    onPlay();
  };
  return (
    <ModalDialog
      title="This file will be converted as it plays"
      onCancel={onCancel}
    >
      <p className="text-sm text-fg-soft">
        Your system cannot play this format directly, so easyImmerse converts it
        while you watch. You can start right away and jump to any point.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={dismissForGood}
          onChange={(event) => setDismissForGood(event.target.checked)}
        />
        Don't show this again
      </label>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" autoFocus onClick={play}>
          Play
        </Button>
      </DialogActions>
    </ModalDialog>
  );
}
