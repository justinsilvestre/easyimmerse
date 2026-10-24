import { useListSyncConflictsQuery } from "@easyimmerse/backend";
import {
  actions,
  selectIsDismissingSyncConflicts,
  selectIsShowingAllSyncConflicts,
} from "@easyimmerse/state";
import type { ConflictKept, SyncConflict } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { capitalized } from "../../lib/formatting/capitalized.ts";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { groupSyncConflicts } from "./groupSyncConflicts.ts";

const keptTexts = {
  other_device: "Kept the change made on another device.",
  this_device: "Kept the change made on this device.",
  deletion: "Deleted on another device, so the change made here was dropped.",
} satisfies Record<ConflictKept, string>;

/**
 * Tells which changes made at the same time on this device and another were replaced by the more recent ones,
 * grouped by project and media file, with a button that dismisses them.
 * `count` is how many there are in all, of which `conflicts` lists the most recent;
 * when it lists fewer, a button fetches and shows the rest.
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
  const isShowingAll = useAppSelector(selectIsShowingAllSyncConflicts);
  const allConflicts = useListSyncConflictsQuery(undefined, {
    skip: !isShowingAll || conflicts.length >= count,
  });
  const shown = allConflicts.data?.conflicts ?? conflicts;
  const groups = groupSyncConflicts(shown);
  return (
    <div className="flex max-w-lg flex-col items-start gap-3 rounded-md border border-line bg-surface p-3 text-sm">
      <p>
        Some items were changed on this device and another at about the same
        time, so only one change to each was kept.
      </p>
      <div className="flex flex-col gap-3 self-stretch">
        {groups.map(({ projectName, conflicts, mediaFiles }) => (
          <section key={projectName ?? ""} className="flex flex-col gap-1.5">
            {(projectName !== null || groups.length > 1) && (
              <h3 className="font-semibold">{projectName ?? "Other"}</h3>
            )}
            <ConflictList conflicts={conflicts} />
            {mediaFiles.map(({ mediaFileName, conflicts }) => (
              <section
                key={mediaFileName}
                className="flex flex-col gap-1 border-l-2 border-line pl-2.5"
              >
                <h4 className="font-medium break-all">{mediaFileName}</h4>
                <ConflictList conflicts={conflicts} />
              </section>
            ))}
          </section>
        ))}
      </div>
      {allConflicts.isError && (
        <p className="text-danger-fg">The other changes could not be loaded.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {shown.length < count && (
          <Button
            size="sm"
            aria-disabled={allConflicts.isFetching}
            onClick={() => {
              if (allConflicts.isFetching) return;
              if (isShowingAll) allConflicts.refetch();
              else dispatch(actions.allSyncConflictsShown());
            }}
          >
            {allConflicts.isFetching ? "Loading…" : `Show all ${count}`}
          </Button>
        )}
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
    </div>
  );
}

function ConflictList({ conflicts }: { conflicts: SyncConflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {conflicts.map(({ id, description, kept }) => (
        <li key={id} className="flex flex-col">
          <span>{capitalized(description)}</span>
          <span className="text-fg-muted">{keptTexts[kept]}</span>
        </li>
      ))}
    </ul>
  );
}
