import type { NoticeContent } from "../notices/noticesState.ts";
import type { BackupSign } from "./selectBackupSign.ts";

/** A backup sign that tells of work that cannot be backed up as it should, rather than of work that was never set up to be. */
export type BackupFault = Extract<
  BackupSign,
  { kind: "failedSaves" | "linkUnreachable" | "linkFailed" | "loggedOut" }
>;

/** The key of the notice of a broken backup, so that a later break replaces it rather than stacking beside it. */
export const backupFaultNoticeKey = "backupFault";

/** Tells whether the sign tells of a backup that cannot go on, such as one whose server cannot be reached. */
export function isBackupFault(sign: BackupSign): sign is BackupFault {
  switch (sign.kind) {
    case "failedSaves":
    case "linkUnreachable":
    case "linkFailed":
    case "loggedOut":
      return true;
    default:
      return false;
  }
}

/** Returns the notice to show when the backup sign changes from `before` to `after`: one only when a backup has just broken. */
export function backupFaultNotice(
  before: BackupSign,
  after: BackupSign,
): NoticeContent | null {
  if (isBackupFault(before) || !isBackupFault(after)) return null;
  return {
    key: backupFaultNoticeKey,
    tone: "danger",
    message: faultMessage(after),
    buttons: [],
    isTransient: true,
  };
}

function faultMessage(fault: BackupFault): string {
  switch (fault.kind) {
    case "failedSaves":
      return "Some flashcards haven't been saved to your server yet.";
    case "linkUnreachable":
      return `Couldn't reach ${fault.serverName}, so your latest work hasn't been backed up there yet.`;
    case "linkFailed":
      return `Your latest work hasn't been backed up to ${fault.serverName}.`;
    case "loggedOut":
      return `You were logged out of ${fault.serverName}, so your latest work hasn't been backed up there.`;
  }
}
