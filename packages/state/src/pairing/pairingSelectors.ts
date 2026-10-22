import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { pairingFailureMessage } from "./pairingFailureMessage.ts";
import {
  canSubmitPairing,
  isPairingBusy,
  type PairingForm,
  type PairingStatus,
  pairingServerUrlOf,
} from "./pairingForm.ts";

/** The pairing form as it shows. */
export type PairingFormView = {
  address: string;
  code: string;
  status: PairingStatus["kind"];
  /** Whether the form waits for a scan or a server's answer, during which it takes no changes. */
  isBusy: boolean;
  canSubmit: boolean;
  /** Why the last attempt stopped, while it stands. */
  message: string | null;
};

const selectPairingFormState = (state: AppRoot) => state.app.pairing;

/** Returns the pairing form as it shows, which keeps its reference until the form changes. */
export const selectPairingForm = createSelector(
  [selectPairingFormState],
  (form) =>
    ({
      address: form.address,
      code: form.code,
      status: form.status.kind,
      isBusy: isPairingBusy(form),
      canSubmit: canSubmitPairing(form),
      message: messageOf(form),
    }) satisfies PairingFormView,
);

/** Tells whether the pairing page is on top of Settings. */
export const selectIsPairingOpen = (state: AppRoot) => {
  const { route } = state.app;
  return route.screen === "settings" && route.pages.at(-1) === "pairing";
};

function messageOf(form: PairingForm): string | null {
  switch (form.status.kind) {
    case "failed":
      return pairingFailureMessage(
        form.status.failure,
        pairingServerUrlOf(form) ?? form.address,
      );
    case "codeMissing":
      return "Enter the six-digit code that the desktop app shows beside its QR code.";
    case "cameraUnavailable":
      return "The camera could not be used. Enter the address and code instead.";
    case "unrecognizedQrCode":
      return "This QR code does not hold the address of an easyImmerse app. Scan the code that the desktop app shows under Local network sync.";
    default:
      return null;
  }
}
