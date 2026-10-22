import type { RequestFailure } from "../server/serverRequest.ts";
import { parsePairingUrl } from "./pairingUrl.ts";

/**
 * How far a pairing has gone: not started, reading a QR code, asking the server whether it has accounts,
 * exchanging the code for the server's token, keeping the connection, or stopped.
 * It stops when the server has accounts, so that the person signs in instead; when the server has no accounts and no code was given;
 * when a scanned QR code holds no address; or when a request failed.
 */
export type PairingStatus =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "checkingServer" }
  | { kind: "claiming" }
  | { kind: "connecting" }
  | { kind: "serverHasAccounts" }
  | { kind: "codeMissing" }
  | { kind: "unrecognizedQrCode" }
  | { kind: "failed"; failure: RequestFailure };

/** The form through which a web or mobile app pairs with a desktop app on the local network. */
export type PairingForm = {
  /** The server's address as the person typed it or a QR code gave it. */
  address: string;
  code: string;
  status: PairingStatus;
};

/** The fields of the pairing form that a person edits. */
export type PairingFields = Pick<PairingForm, "address" | "code">;

export const initialPairingForm: PairingForm = {
  address: "",
  code: "",
  status: { kind: "idle" },
};

/** The origin of the server the form names, or null when its address is not an HTTP or HTTPS address. */
export function pairingServerUrlOf(form: PairingForm): string | null {
  return parsePairingUrl(form.address)?.serverUrl ?? null;
}

/** The code as the server compares it, without spaces. */
export function enteredCodeOf(form: PairingForm): string {
  return form.code.replace(/\s/g, "");
}

/** Whether the form waits for a scan or for a server's answer, during which it takes no changes. */
export function isPairingBusy(form: PairingForm): boolean {
  return ["scanning", "checkingServer", "claiming", "connecting"].includes(
    form.status.kind,
  );
}

/** Whether the form can be sent: it is not busy and it names a server. */
export function canSubmitPairing(form: PairingForm): boolean {
  return !isPairingBusy(form) && pairingServerUrlOf(form) !== null;
}
