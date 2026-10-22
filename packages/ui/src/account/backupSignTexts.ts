import type { BackupSign } from "@easyimmerse/state";

/** What the backup sign's panel says, and whether it offers to log in. */
type BackupSignTexts = { explanation: string; offersLogIn: boolean };

const deviceLosses = {
  desktop:
    "Your work is kept only on this computer, so you'll lose it if the computer is lost or its disk fails.",
  mobile:
    "Your work is kept only on this device, so you'll lose it if the device is lost or the app is deleted.",
};

/** Returns what the backup sign's panel says, or null when the sign is hidden. */
export function backupSignTexts(sign: BackupSign): BackupSignTexts | null {
  switch (sign.kind) {
    case "hidden":
      return null;
    case "browserOnly":
      return {
        explanation:
          "Your flashcards aren't backed up. They're stored only in this browser, so you'll lose them if its data is cleared.",
        offersLogIn: true,
      };
    case "failedSaves":
      return {
        explanation:
          "Some flashcards couldn't be saved to your server yet. They're kept in this browser until they're saved, so you'll lose them if its data is cleared.",
        offersLogIn: false,
      };
    case "deviceOnly":
      return {
        explanation: `${deviceLosses[sign.platform]} Log in to ${sign.hasOfficialServer ? "the easyImmerse cloud or to your own server" : "your own easyImmerse server"} to keep a copy there.`,
        offersLogIn: true,
      };
  }
}
