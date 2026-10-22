import type { PairingGrant, ServerAuthInfo } from "@easyimmerse/types";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { PairingFields } from "./pairingForm.ts";

/** The action creators of pairing with a desktop app on the local network. */
export const pairingActions = {
  /** The person changed fields of the pairing form. */
  pairingFormChanged: (changes: Partial<PairingFields>) =>
    ({ type: "pairingFormChanged", changes }) as const,
  /** The person sent the pairing form. */
  pairingSubmitted: () => ({ type: "pairingSubmitted" }) as const,
  /** The person asked to scan a QR code. */
  pairingScanRequested: () => ({ type: "pairingScanRequested" }) as const,
  /** The person closed the camera without scanning a QR code. */
  pairingScanCancelled: () => ({ type: "pairingScanCancelled" }) as const,
  /** A QR code was read, or the scan ended without one when the text is null. */
  pairingCodeScanned: (text: string | null) =>
    ({ type: "pairingCodeScanned", text }) as const,
  /** The server to pair with said whether it has accounts. */
  pairingServerChecked: (serverUrl: string, info: ServerAuthInfo) =>
    ({ type: "pairingServerChecked", serverUrl, info }) as const,
  /** The server took the pairing code and gave its token. */
  pairingCodeClaimed: (serverUrl: string, grant: PairingGrant) =>
    ({ type: "pairingCodeClaimed", serverUrl, grant }) as const,
  /** Asking the server, claiming the code, or keeping the connection failed. */
  pairingFailed: (failure: RequestFailure) =>
    ({ type: "pairingFailed", failure }) as const,
};

/** An action of pairing. */
export type PairingAction = ReturnType<
  (typeof pairingActions)[keyof typeof pairingActions]
>;
