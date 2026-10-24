import { type AppAction, actions, type BackupSign } from "@easyimmerse/state";
import { formatSinceTime } from "../lib/formatting/formatSinceTime.ts";
import { deviceNames } from "../lib/sync/deviceNames.ts";
import { syncFailureReason } from "../lib/sync/syncFailureReason.ts";

/** A button the Sync menu offers: its label and the actions it dispatches. */
export type SyncMenuOption = { label: string; actions: readonly AppAction[] };

/** What the Sync menu says while the work is not backed up, and the one button that fixes a broken backup, if any. */
type BackupSignTexts = {
  explanation: string;
  fix: SyncMenuOption | null;
};

const deviceLosses = {
  desktop:
    "Your work is currently being stored only on this computer. If the computer is lost or its disk fails, you may lose all your work.",
  mobile:
    "Your work is currently being stored only on this device. If the device is lost or the app is deleted, you may lose all your work.",
};

const tryAgain: SyncMenuOption = {
  label: "Try again",
  actions: [actions.syncRunRequested()],
};

/** Returns what the Sync menu says about backing up, or null when there is nothing to say. `now` dates the moment a remote became unreachable. */
export function backupSignTexts(
  sign: BackupSign,
  now: number = Date.now(),
): BackupSignTexts | null {
  switch (sign.kind) {
    case "hidden":
      return null;
    case "browserOnly":
      return {
        explanation:
          "Your flashcards are currently only stored in this browser. If your browser data gets cleared, you may lose all your work.",
        fix: null,
      };
    case "failedSaves":
      return {
        explanation:
          "Some flashcards haven't been saved to your server yet. Until they are, they're stored only in this browser, and you may lose them if your browser data gets cleared.",
        fix: null,
      };
    case "deviceOnly":
      return {
        explanation: `${deviceLosses[sign.platform]} Log in to ${sign.hasOfficialServer ? "the easyImmerse cloud" : "an easyImmerse server"} to back it up there.`,
        fix: null,
      };
    case "linkUnreachable":
      return {
        explanation: `Couldn't reach ${sign.serverName} since ${formatSinceTime(sign.sinceMs, now)}, so your latest work hasn't been backed up there yet. It will be backed up once the server can be reached.`,
        fix: tryAgain,
      };
    case "linkFailed": {
      const host = sign.serverName;
      return {
        explanation: `Your latest work hasn't been backed up to ${host}. ${syncFailureReason(sign.code, host, deviceNames[sign.platform], sign.isCloudServer)}`,
        fix: tryAgain,
      };
    }
    case "loggedOut":
      return {
        explanation: `You were logged out of ${sign.serverName} on ${deviceNames[sign.platform]}, so your latest work hasn't been backed up there. Log in again to back it up.`,
        fix: {
          label: "Log in again",
          actions: [
            actions.relinkRequested(sign.serverUrl, sign.email),
            actions.navigated({ type: "openAccountSettings" }),
          ],
        },
      };
  }
}
