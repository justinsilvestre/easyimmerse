import type { Effects } from "@easyimmerse/state";
import { requestJson } from "./accountEffects.ts";

/** The effects through which a browser pairs with a desktop app on the local network. */
export type PairingEffects = Pick<
  Effects,
  "claimPairingCode" | "scanPairingCode"
>;

/**
 * Builds the pairing effects over the given fetch.
 * A browser has no scanner of its own; the UI reads QR codes through the camera where the browser can.
 */
export function createPairingEffects(fetchFn: typeof fetch): PairingEffects {
  return {
    claimPairingCode: (serverUrl, code) =>
      requestJson(fetchFn, new URL("/pairing/claim", serverUrl), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      }),
    scanPairingCode: async () => ({ kind: "cameraUnavailable" }),
  };
}
