import { describe, expect, it } from "vitest";
import { pairingCodeRenewalDelayMs } from "./pairingCodeRenewalDelay.ts";

describe("pairingCodeRenewalDelayMs", () => {
  it("waits until shortly before the code expires", () => {
    expect(pairingCodeRenewalDelayMs(600_000, 0)).toBe(585_000);
  });

  it("renews a code that has expired at once", () => {
    expect(pairingCodeRenewalDelayMs(1_000, 5_000)).toBe(1);
  });
});
