import { type AppAction, actions, type BackupSign } from "@easyimmerse/state";
import { formatSinceTime } from "./formatSinceTime.ts";

/** What the backup sign's panel says, and the button it offers with the actions that button dispatches, if any. */
type BackupSignTexts = {
  explanation: string;
  button: { label: string; actions: readonly AppAction[] } | null;
};

const deviceLosses = {
  desktop:
    "Your work is kept only on this computer, so you'll lose it if the computer is lost or its disk fails.",
  mobile:
    "Your work is kept only on this device, so you'll lose it if the device is lost or the app is deleted.",
};

const deviceNames = { desktop: "this computer", mobile: "this device" };

const openAccountSettings = actions.navigated({ type: "openAccountSettings" });

const logInButton = {
  label: "Log in or sign up",
  actions: [openAccountSettings],
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
          "Your flashcards aren't backed up. They're stored only in this browser, so you'll lose them if its data is cleared.",
        button: logInButton,
      };
    case "failedSaves":
      return {
        explanation:
          "Some flashcards couldn't be saved to your server yet. They're kept in this browser until they're saved, so you'll lose them if its data is cleared.",
        button: null,
      };
    case "deviceOnly":
      return {
        explanation: `${deviceLosses[sign.platform]} Log in to ${sign.hasOfficialServer ? "the easyImmerse cloud or to your own server" : "your own easyImmerse server"} to keep a copy there.`,
        button: logInButton,
      };
    case "linkFailing":
      return {
        explanation: linkFailingExplanation(sign, now),
        button: {
          label: "Open account settings",
          actions: [openAccountSettings],
        },
      };
    case "loggedOut":
      return {
        explanation: `You were logged out of ${hostOf(sign.serverUrl)} on ${deviceNames[sign.platform]}, so your latest work is kept only here. Log in again to keep a copy there.`,
        button: {
          label: "Log in again",
          actions: [
            actions.relinkRequested(sign.serverUrl, sign.email),
            openAccountSettings,
          ],
        },
      };
  }
}

function linkFailingExplanation(
  sign: Extract<BackupSign, { kind: "linkFailing" }>,
  now: number,
): string {
  const kept = `Your latest work is kept only on ${deviceNames[sign.platform]}, because ${hostOf(sign.serverUrl)}`;
  // A remote that refused to sync will not take the work by itself once it answers, so the copy says where to see why.
  if (sign.sinceMs === null)
    return `${kept} refused to synchronize. Open the account settings to see why.`;
  return `${kept} couldn't be reached since ${formatSinceTime(sign.sinceMs, now)}. It will be copied there when the server can be reached.`;
}

/** The host of a server's address, as the person would recognize it. */
function hostOf(serverUrl: string): string {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl;
  }
}
