import type { RecoverableWork } from "./recoverableWork.ts";

/** The action creators of the recovery. */
export const recoveryActions = {
  /** The work kept on the device was read, or could not be. */
  recoverableWorkLoaded: (work: RecoverableWork | "unreadable") =>
    ({ type: "recoverableWorkLoaded", work }) as const,
};

/** An action of the recovery. */
export type RecoveryAction = ReturnType<
  (typeof recoveryActions)[keyof typeof recoveryActions]
>;
