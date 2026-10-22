import { actions, selectIsDismissingSyncConflicts } from "@easyimmerse/state";
import type { ConflictKept, SyncConflict } from "@easyimmerse/types";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

const keptTexts = {
  other_device: "the change made on another device was kept.",
  this_device: "the change made on this device was kept.",
  deletion:
    "it was deleted on another device, so the change made here was dropped.",
} satisfies Record<ConflictKept, string>;

/**
 * Tells which changes made at the same time on this device and another were replaced by the more recent ones,
 * with a button that dismisses them.
 * `count` is how many there are in all, of which `conflicts` lists the most recent.
 */
export function SyncConflictsNotice({
  conflicts,
  count,
}: {
  conflicts: SyncConflict[];
  count: number;
}) {
  const dispatch = useAppDispatch();
  const isDismissing = useAppSelector(selectIsDismissingSyncConflicts);
  const introId = useId();
  const unlisted = count - conflicts.length;
  return (
    <div className="flex max-w-lg flex-col items-start gap-2 rounded-md border border-line bg-surface p-3 text-sm">
      <p id={introId}>
        While this device and another were changed at the same time, the more
        recent change was kept.
      </p>
      <ul aria-labelledby={introId} className="flex flex-col gap-1">
        {conflicts.map((conflict) => (
          <li key={conflict.id}>{conflictText(conflict)}</li>
        ))}
        {unlisted > 0 && <li>And {unlisted} more.</li>}
      </ul>
      <Button
        size="sm"
        aria-disabled={isDismissing}
        onClick={() => {
          if (!isDismissing) dispatch(actions.syncConflictsDismissed());
        }}
      >
        {isDismissing ? "Dismissing…" : "Dismiss"}
      </Button>
    </div>
  );
}

function conflictText({ description, kept }: SyncConflict): string {
  const named = description.charAt(0).toUpperCase() + description.slice(1);
  return `${named}: ${keptTexts[kept]}`;
}
