import { actions, type SyncPlace } from "@easyimmerse/state";
import type { SyncMenuOption } from "./backupSignTexts.ts";

const openAccountSettings = actions.navigated({ type: "openAccountSettings" });

const openPairing = actions.navigated({ type: "openPairing" });

const logIn: SyncMenuOption = {
  label: "Log in or sign up",
  actions: [openAccountSettings],
};

/**
 * Returns the buttons the Sync menu offers below its status: only those that would change where the work is kept.
 * Work kept only on this device may go to a server or to a paired app, and work on a paired desktop app whose server has accounts may go to an account there.
 */
export function syncMenuOptions(place: SyncPlace): readonly SyncMenuOption[] {
  switch (place.kind) {
    case "thisDevice":
      return [
        logIn,
        {
          label:
            place.device === "computer"
              ? "Let other devices connect"
              : "Pair with your desktop app",
          actions: [openPairing],
        },
      ];
    case "pairedDesktop":
      return place.usesAccounts ? [logInTo(place.serverUrl)] : [];
    case "server":
      return [];
  }
}

function logInTo(serverUrl: string): SyncMenuOption {
  return {
    label: "Log in",
    actions: [
      actions.signInFormChanged({
        serverChoice: "own",
        ownServerUrl: serverUrl,
      }),
      openAccountSettings,
    ],
  };
}
