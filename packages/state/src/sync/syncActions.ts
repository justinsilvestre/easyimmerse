/** The action creators of the native app's syncing with the remote its built-in server is linked to. */
export const syncActions = {
  /** The built-in server applied changes it pulled from the remote, so data the app shows may have changed. */
  syncPulledChanges: () => ({ type: "syncPulledChanges" }) as const,
  /** The built-in server reported a conflict newer than the one it reported before, which the id names. */
  syncConflictsReported: (conflictId: string) =>
    ({ type: "syncConflictsReported", conflictId }) as const,
  /** The person asked the built-in server to sync with the remote now. */
  syncRunRequested: () => ({ type: "syncRunRequested" }) as const,
  /** The person asked to see every conflict, not only the most recent ones the status lists. */
  allSyncConflictsShown: () => ({ type: "allSyncConflictsShown" }) as const,
  /** The person dismissed the conflicts the built-in server recorded. */
  syncConflictsDismissed: () => ({ type: "syncConflictsDismissed" }) as const,
  /** The person chose whether a server keeps a copy of a media file's bytes. */
  uploadChoiceToggled: (
    projectId: string,
    mediaFileId: string,
    isUploadChosen: boolean,
  ) =>
    ({
      type: "uploadChoiceToggled",
      projectId,
      mediaFileId,
      isUploadChosen,
    }) as const,
  /** The person asked to upload a file this browser holds, for the server to keep a copy of. */
  storedCopyUploadRequested: (projectId: string, mediaFileId: string) =>
    ({ type: "storedCopyUploadRequested", projectId, mediaFileId }) as const,
  /** The person asked the built-in server to download the copy its remote keeps of a media file. */
  storedCopyFetchRequested: (projectId: string, mediaFileId: string) =>
    ({ type: "storedCopyFetchRequested", projectId, mediaFileId }) as const,
  /** The person asked to delete the copy a server keeps of a media file, which waits for them to confirm it. */
  storedCopyDeletionAsked: (mediaFileId: string) =>
    ({ type: "storedCopyDeletionAsked", mediaFileId }) as const,
  /** The person chose to keep the copy after all. */
  storedCopyDeletionCancelled: () =>
    ({ type: "storedCopyDeletionCancelled" }) as const,
};

/** An action of syncing with the remote. */
export type SyncAction = ReturnType<
  (typeof syncActions)[keyof typeof syncActions]
>;
