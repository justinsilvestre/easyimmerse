/** How long before a pairing code expires the app asks for the next one, so that the code on screen never stops working. */
const renewalMarginMs = 15_000;

/**
 * Returns how many milliseconds from now to wait before asking for a new pairing code, given when the current one expires.
 * A code that expires soon, or has expired, is renewed after one millisecond.
 */
export function pairingCodeRenewalDelayMs(expiresAtMs: number, nowMs: number) {
  return Math.max(1, expiresAtMs - renewalMarginMs - nowMs);
}
