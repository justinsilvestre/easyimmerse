import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { selectIsPairingOpen, selectPairingForm } from "./pairingSelectors.ts";

describe("selectIsPairingOpen", () => {
  it("returns true while the pairing page is on top of Settings", () => {
    const state = {
      app: stateAfter(actions.navigated({ type: "openPairing" })),
    };
    expect(selectIsPairingOpen(state)).toBe(true);
  });

  it("returns false on the general settings", () => {
    const state = {
      app: stateAfter(actions.navigated({ type: "openSettings" })),
    };
    expect(selectIsPairingOpen(state)).toBe(false);
  });
});

describe("selectPairingForm", () => {
  it("lets a form with an address be sent", () => {
    const state = {
      app: stateAfter(actions.pairingFormChanged({ address: "192.168.1.5" })),
    };
    expect(selectPairingForm(state).canSubmit).toBe(true);
  });

  it("keeps a form without an address from being sent", () => {
    const state = {
      app: stateAfter(actions.pairingFormChanged({ code: "123456" })),
    };
    expect(selectPairingForm(state).canSubmit).toBe(false);
  });

  it("asks for the code when the server needs one", () => {
    const state = {
      app: stateAfter(
        actions.pairingFormChanged({ address: "http://192.168.1.5:8787" }),
        actions.pairingSubmitted(),
        actions.pairingServerChecked("http://192.168.1.5:8787", {
          accounts: false,
          open_signup: false,
        }),
      ),
    };
    expect(selectPairingForm(state).message).toBe(
      "Enter the six-digit code that the desktop app shows beside its QR code.",
    );
  });
});
