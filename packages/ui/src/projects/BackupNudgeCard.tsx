import type { BackupSign, SyncPlace } from "@easyimmerse/state";
import { useId } from "react";
import { backupSignTexts } from "../account/backupSignTexts.ts";
import { syncMenuOptions } from "../account/syncMenuOptions.ts";
import { syncStatusLine } from "../account/syncStatusLine.ts";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";

/**
 * A card that warns that the person's work is kept only on this device and could be lost,
 * with the Sync menu's ways of keeping it elsewhere and a "Not now" button, which calls `onDismiss`.
 */
export function BackupNudgeCard({
  place,
  sign,
  onDismiss,
}: {
  place: SyncPlace;
  sign: BackupSign;
  onDismiss: () => void;
}) {
  const headingId = useId();
  const dispatch = useAppDispatch();
  const explanation = backupSignTexts(sign)?.explanation;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 text-sm"
    >
      <h2 id={headingId} className="text-base font-semibold">
        {syncStatusLine(place, sign)}
      </h2>
      {explanation && <p className="text-fg-muted">{explanation}</p>}
      <div className="flex flex-wrap gap-2">
        {syncMenuOptions(place).map((option) => (
          <Button
            key={option.label}
            size="sm"
            onClick={() => {
              for (const action of option.actions) dispatch(action);
            }}
          >
            {option.label}
          </Button>
        ))}
        <Button size="sm" variant="subtle" onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </section>
  );
}
