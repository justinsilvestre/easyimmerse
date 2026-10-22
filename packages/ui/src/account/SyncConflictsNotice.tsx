import { actions, selectIsDismissingSyncConflicts } from "@easyimmerse/state";
import type { ConflictKept, SyncConflict } from "@easyimmerse/types";
import { useId } from "react";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";

const keptTexts = {
  other_device: "Kept the change made on another device.",
  this_device: "Kept the change made on this device.",
  deletion: "Deleted on another device, so the change made here was dropped.",
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
    <div className="flex max-w-lg flex-col items-start gap-3 rounded-md border border-line bg-surface p-3 text-sm">
      <p id={introId}>
        Some items were changed on this device and another at about the same
        time, so only one change to each was kept.
      </p>
      <ul
        aria-labelledby={introId}
        className="flex flex-col gap-2 self-stretch"
      >
        {conflicts.map(({ id, description, kept }) => (
          <li key={id} className="flex flex-col">
            <span className="font-medium">{capitalized(description)}</span>
            <span className="text-fg-muted">{keptTexts[kept]}</span>
          </li>
        ))}
        {unlisted > 0 && (
          <li className="text-fg-muted">And {unlisted} more.</li>
        )}
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

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
