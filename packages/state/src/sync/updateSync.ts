import { dispatch } from "../app/dispatchEffect.ts";
import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { noticesActions } from "../notices/noticesActions.ts";
import type { OperationsState } from "../operations/operations.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { personBoundPreferenceKeys } from "../preferences/preferenceScope.ts";
import { routeActions } from "../route/routeActions.ts";
import type { ServerRequest } from "../server/serverRequest.ts";

/** Which conflict the person was last told of, so that the same conflict raises its notice only once. */
export type SyncState = { notifiedConflictId: string | null };

/** The id of the request that asks the built-in server to sync now. */
export const runSyncRequestId = "sync/run";

/** The id of the request that dismisses the conflicts the built-in server recorded. */
export const dismissSyncConflictsRequestId = "sync/dismissConflicts";

/** The key of the notice that tells of conflicts, by which a newer one replaces it. */
export const syncConflictsNoticeKey = "sync-conflicts";

const conflictsNotice = dispatch(
  noticesActions.noticeRequested({
    key: syncConflictsNoticeKey,
    tone: "info",
    message:
      "Some changes made at the same time on this device and another were replaced by the more recent ones.",
    buttons: [
      {
        label: "Open account settings",
        action: routeActions.navigated({ type: "openAccountSettings" }),
      },
    ],
    isTransient: false,
  }),
);

/**
 * Follows the native app's syncing with the remote its built-in server is linked to:
 * it reloads the preferences that follow the person once changes are pulled, tells the person of each new conflict once,
 * and sends the person's requests to sync now and to dismiss the conflicts.
 */
export const updateSync: FeatureUpdate<SyncState, "operations"> = (
  sync,
  action,
  { operations },
) => {
  switch (action.type) {
    case "syncPulledChanges":
      return updated(sync, {
        type: "loadPreferences",
        keys: personBoundPreferenceKeys,
      });
    case "syncConflictsReported":
      if (action.conflictId === sync.notifiedConflictId) return updated(sync);
      return updated(
        { notifiedConflictId: action.conflictId },
        conflictsNotice,
      );
    case "syncRunRequested":
      return updated(
        sync,
        ...sendOnce(operations, runSyncRequestId, { kind: "runSync" }),
      );
    case "syncConflictsDismissed":
      return updated(
        sync,
        ...sendOnce(operations, dismissSyncConflictsRequestId, {
          kind: "dismissSyncConflicts",
        }),
      );
    default:
      return updated(sync);
  }
};

/** The syncing with the remote as a feature. */
export const syncFeature: Feature<SyncState, "operations"> = {
  initialState: { notifiedConflictId: null },
  update: updateSync,
};

function sendOnce(
  operations: OperationsState,
  id: string,
  request: ServerRequest,
): Effect[] {
  if (selectIsRequestInFlight({ operations }, id)) return [];
  return [{ type: "sendRequest", id, request }];
}
