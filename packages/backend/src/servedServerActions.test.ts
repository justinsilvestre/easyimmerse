import { actions } from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { servedServerActions } from "./servedServerActions.ts";

const origin = "http://192.168.1.5:8787";

describe("servedServerActions", () => {
  it("fills in the sign-in form for a server with accounts", () => {
    expect(
      servedServerActions({
        kind: "serverFound",
        serverUrl: origin,
        info: { accounts: true, open_signup: false, sends_email: false },
      }),
    ).toEqual([
      actions.signInFormChanged({ serverChoice: "own", ownServerUrl: origin }),
    ]);
  });

  it("fills in the pairing address for a server without accounts", () => {
    expect(
      servedServerActions({
        kind: "serverFound",
        serverUrl: origin,
        info: { accounts: false, open_signup: false, sends_email: false },
      }),
    ).toEqual([actions.pairingFormChanged({ address: origin })]);
  });

  it("opens the pairing page after a failed pairing", () => {
    const failure = { status: "NETWORK", message: "" } as const;
    expect(
      servedServerActions({
        kind: "pairingFailed",
        serverUrl: origin,
        code: "123456",
        failure,
      }).at(-1),
    ).toEqual(actions.navigated({ type: "openPairing" }));
  });

  it("opens the pairing page with the offered address and code filled in", () => {
    expect(
      servedServerActions({
        kind: "pairingOffered",
        serverUrl: origin,
        code: "123456",
      }),
    ).toEqual([
      actions.pairingFormChanged({ address: origin, code: "123456" }),
      actions.navigated({ type: "openPairing" }),
    ]);
  });
});
