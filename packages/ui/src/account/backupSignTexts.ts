import {
  type AppAction,
  actions,
  type BackupSign,
  hostOf,
} from "@easyimmerse/state";
import { deviceNames } from "./deviceNames.ts";
import { formatSinceTime } from "./formatSinceTime.ts";
import { syncFailureReason } from "./syncFailureReason.ts";

/** One way the backup sign's panel offers to back the work up: its button's label and the actions it dispatches. */
type BackupOption = { label: string; actions: readonly AppAction[] };

/** What the backup sign's panel says, and the ways of backing the work up that it offers. */
type BackupSignTexts = {
  explanation: string;
  options: readonly BackupOption[];
};

const deviceLosses = {
  desktop:
    "Your work is currently being stored only on this computer. If the computer is lost or its disk fails, you may lose all your work.",
  mobile:
    "Your work is currently being stored only on this device. If the device is lost or the app is deleted, you may lose all your work.",
};

const openAccountSettings = actions.navigated({ type: "openAccountSettings" });

const logIn: BackupOption = {
  label: "Log in or sign up",
  actions: [openAccountSettings],
};

const tryAgain: BackupOption = {
  label: "Try again",
  actions: [actions.syncRunRequested()],
};

/** Returns what the backup sign's panel says, or null when the sign is hidden. `now` dates the moment a remote became unreachable. */
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
        options: [logIn],
      };
    case "failedSaves":
      return {
        explanation:
          "Some flashcards haven't been saved to your server yet. Until they are, they're stored only in this browser, and you may lose them if your browser data gets cleared.",
        options: [],
      };
    case "deviceOnly":
      return {
        explanation: `${deviceLosses[sign.platform]} Log in to ${sign.hasOfficialServer ? "the easyImmerse cloud or to your own server" : "your own easyImmerse server"} to back it up there.`,
        options: [logIn],
      };
    case "linkUnreachable":
      return {
        explanation: `${hostOf(sign.serverUrl)} couldn't be reached since ${formatSinceTime(sign.sinceMs, now)}, so your latest work hasn't been backed up there yet. It will be backed up once the server can be reached.`,
        options: [tryAgain],
      };
    case "linkFailed": {
      const host = hostOf(sign.serverUrl);
      return {
        explanation: `Your latest work hasn't been backed up to ${host}. ${syncFailureReason(sign.code, host, deviceNames[sign.platform])}`,
        options: [
          tryAgain,
          { label: "Open account settings", actions: [openAccountSettings] },
        ],
      };
    }
    case "loggedOut":
      return {
        explanation: `You were logged out of ${hostOf(sign.serverUrl)} on ${deviceNames[sign.platform]}, so your latest work hasn't been backed up there. Log in again to back it up.`,
        options: [
          {
            label: "Log in again",
            actions: [
              actions.relinkRequested(sign.serverUrl, sign.email),
              openAccountSettings,
            ],
          },
        ],
      };
  }
}
