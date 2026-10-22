/** The action creators of the native app's syncing with the remote its built-in server is linked to. */
export const syncActions = {
  /** The built-in server applied changes it pulled from the remote, so data the app shows may have changed. */
  syncPulledChanges: () => ({ type: "syncPulledChanges" }) as const,
  /** The built-in server reported a conflict newer than the one it reported before, which the id names. */
  syncConflictsReported: (conflictId: string) =>
    ({ type: "syncConflictsReported", conflictId }) as const,
  /** The person asked the built-in server to sync with the remote now. */
  syncRunRequested: () => ({ type: "syncRunRequested" }) as const,
  /** The person dismissed the conflicts the built-in server recorded. */
  syncConflictsDismissed: () => ({ type: "syncConflictsDismissed" }) as const,
};

/** An action of syncing with the remote. */
export type SyncAction = ReturnType<
  (typeof syncActions)[keyof typeof syncActions]
>;
