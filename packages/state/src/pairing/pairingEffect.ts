import type { ServerConfig } from "../server/serverState.ts";

/**
 * The side effects of pairing: reading a QR code with the platform's scanner, asking the server whether it has accounts,
 * exchanging the code for its token, and connecting the app to it, which starts the app anew.
 */
export type PairingEffect =
  | { type: "scanPairingCode" }
  | { type: "checkPairingServer"; serverUrl: string }
  | { type: "claimPairingCode"; serverUrl: string; code: string }
  | { type: "connectPairedServer"; server: ServerConfig };
