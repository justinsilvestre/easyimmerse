import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { initialAppState } from "../app/update.ts";
import type {
  OperationsState,
  RequestRecord,
} from "../operations/operations.ts";
import {
  dismissSyncConflictsRequestId,
  runSyncRequestId,
  type SyncState,
  syncConflictsNoticeKey,
  syncFeature,
} from "./updateSync.ts";

/** What the sync update reads: the requests in flight, no server, and an empty cache. */
const readsWith = (operations: OperationsState) => ({
  operations,
  server: initialAppState.server,
  backend: { queries: {} },
});

/** The sync slice after the actions, and the effects of the last one. */
function syncAfter(
  ...syncActions: AppAction[]
): readonly [SyncState, readonly Effect[]] {
  return syncActions.reduce<readonly [SyncState, readonly Effect[]]>(
    ([sync], action) =>
      syncFeature.update(sync, action, readsWith(initialAppState.operations)),
    [syncFeature.initialState, []],
  );
}

const waitingFor = (id: string): OperationsState => ({
  ...initialAppState.operations,
  requests: [
    {
      id,
      request: { kind: "runSync" },
      isWaiting: false,
      isSlow: false,
    } satisfies RequestRecord,
  ],
});

describe("updateSync", () => {
  it("reloads the preferences that follow the person once changes are pulled", () => {
    const [, effects] = syncAfter(actions.syncPulledChanges());
    expect(effects).toEqual([
      {
        type: "loadPreferences",
        keys: ["showTranslations", "showReviewIntervals"],
      },
    ]);
  });

  describe("when a conflict is reported", () => {
    it("tells the person of it with a way to the account settings", () => {
      const [, effects] = syncAfter(actions.syncConflictsReported("c1"));
      expect(effects).toEqual([
        {
          type: "dispatch",
          action: actions.noticeRequested({
            key: syncConflictsNoticeKey,
            tone: "info",
            message:
              "Some changes made at the same time on this device and another were replaced by the more recent ones.",
            buttons: [
              {
                label: "Open account settings",
                action: actions.navigated({ type: "openAccountSettings" }),
              },
            ],
            isTransient: false,
          }),
        },
      ]);
    });

    it("keeps that the person was told of it", () => {
      const [sync] = syncAfter(actions.syncConflictsReported("c1"));
      expect(sync.notifiedConflictId).toBe("c1");
    });

    it("does not tell of the same conflict twice", () => {
      const [, effects] = syncAfter(
        actions.syncConflictsReported("c1"),
        actions.syncConflictsReported("c1"),
      );
      expect(effects).toEqual([]);
    });

    it("tells of a newer conflict", () => {
      const [, effects] = syncAfter(
        actions.syncConflictsReported("c1"),
        actions.syncConflictsReported("c2"),
      );
      expect(effects).toHaveLength(1);
    });
  });

  it("asks the built-in server to sync now", () => {
    const [, effects] = syncAfter(actions.syncRunRequested());
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: runSyncRequestId,
        request: { kind: "runSync" },
      },
    ]);
  });

  it("does not ask to sync again while the built-in server has not answered", () => {
    const [, effects] = syncFeature.update(
      syncFeature.initialState,
      actions.syncRunRequested(),
      readsWith(waitingFor(runSyncRequestId)),
    );
    expect(effects).toEqual([]);
  });

  it("asks the built-in server to dismiss the conflicts", () => {
    const [, effects] = syncAfter(actions.syncConflictsDismissed());
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: dismissSyncConflictsRequestId,
        request: { kind: "dismissSyncConflicts" },
      },
    ]);
  });
});
