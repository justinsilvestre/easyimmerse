import type { FailedRequest } from "../operations/failedRequests.ts";

/** The action creators of the recovery. */
export const recoveryActions = {
  /** The saves kept on the device were read, or could not be. */
  recoverableSavesLoaded: (saves: readonly FailedRequest[] | "unreadable") =>
    ({ type: "recoverableSavesLoaded", saves }) as const,
};

/** An action of the recovery. */
export type RecoveryAction = ReturnType<
  (typeof recoveryActions)[keyof typeof recoveryActions]
>;
