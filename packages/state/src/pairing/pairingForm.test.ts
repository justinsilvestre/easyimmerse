import { describe, expect, it } from "vitest";
import {
  canSubmitPairing,
  enteredCodeOf,
  initialPairingForm,
  isPairingBusy,
  type PairingForm,
  pairingServerUrlOf,
} from "./pairingForm.ts";

function formWith(changes: Partial<PairingForm>): PairingForm {
  return { ...initialPairingForm, ...changes };
}

describe("pairingServerUrlOf", () => {
  it("reads an address without a scheme as HTTP", () => {
    expect(pairingServerUrlOf(formWith({ address: "192.168.1.5:8787" }))).toBe(
      "http://192.168.1.5:8787",
    );
  });

  it("returns null for an address that is not HTTP or HTTPS", () => {
    expect(
      pairingServerUrlOf(formWith({ address: "ftp://192.168.1.5" })),
    ).toBeNull();
  });
});

describe("enteredCodeOf", () => {
  it("drops the spaces a person typed", () => {
    expect(enteredCodeOf(formWith({ code: " 123 456 " }))).toBe("123456");
  });
});

describe("isPairingBusy", () => {
  it("returns true while the server is asked", () => {
    expect(isPairingBusy(formWith({ status: { kind: "claiming" } }))).toBe(
      true,
    );
  });

  it("returns false after a failure", () => {
    expect(
      isPairingBusy(
        formWith({
          status: {
            kind: "failed",
            failure: { status: "NETWORK", message: "" },
          },
        }),
      ),
    ).toBe(false);
  });
});

describe("canSubmitPairing", () => {
  it("returns true for an idle form with an address", () => {
    expect(canSubmitPairing(formWith({ address: "192.168.1.5" }))).toBe(true);
  });

  it("returns false for a form without an address", () => {
    expect(canSubmitPairing(formWith({ code: "123456" }))).toBe(false);
  });

  it("returns false while the form waits for an answer", () => {
    expect(
      canSubmitPairing(
        formWith({
          address: "192.168.1.5",
          status: { kind: "checkingServer" },
        }),
      ),
    ).toBe(false);
  });
});
