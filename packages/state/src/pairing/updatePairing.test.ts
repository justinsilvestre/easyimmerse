import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import type { ServerState } from "../server/serverState.ts";
import type { PairingForm } from "./pairingForm.ts";
import { pairingFeature, updatePairing } from "./updatePairing.ts";

const desktop = "http://192.168.1.5:8787";

const web: ServerState = { config: null, cloudUrl: null };

const mobile: ServerState = {
  config: { serverUrl: "http://127.0.0.1:1", token: "t", bundledIn: "mobile" },
  cloudUrl: null,
};

/** The pairing form after the actions, and the effects of the last one. */
function pairingAfter(
  server: ServerState,
  ...pairingActions: AppAction[]
): readonly [PairingForm, readonly Effect[]] {
  return pairingActions.reduce<readonly [PairingForm, readonly Effect[]]>(
    ([form], action) => updatePairing(form, action, { server }),
    [pairingFeature.initialState, []],
  );
}

const filledIn = actions.pairingFormChanged({
  address: "192.168.1.5:8787",
  code: "123 456",
});

const submitted = [filledIn, actions.pairingSubmitted()] as const;

const checked = (accounts: boolean) =>
  actions.pairingServerChecked(desktop, {
    accounts,
    open_signup: false,
    sends_email: false,
  });

const failure = { status: "NETWORK", message: "offline" } as const;

describe("updatePairing", () => {
  describe("when the form is sent", () => {
    it("asks the server whether it has accounts", () => {
      const [, effects] = pairingAfter(web, ...submitted);
      expect(effects).toEqual([
        { type: "checkPairingServer", serverUrl: desktop },
      ]);
    });

    it("shows that it is checking the server", () => {
      const [form] = pairingAfter(web, ...submitted);
      expect(form.status).toEqual({ kind: "checkingServer" });
    });

    it("does nothing without an address", () => {
      const [, effects] = pairingAfter(web, actions.pairingSubmitted());
      expect(effects).toEqual([]);
    });

    it("takes no changes while it waits", () => {
      const [form] = pairingAfter(
        web,
        ...submitted,
        actions.pairingFormChanged({ code: "999999" }),
      );
      expect(form.code).toBe("123 456");
    });
  });

  describe("when the server has no accounts", () => {
    it("claims the code without its spaces", () => {
      const [, effects] = pairingAfter(web, ...submitted, checked(false));
      expect(effects).toEqual([
        { type: "claimPairingCode", serverUrl: desktop, code: "123456" },
      ]);
    });

    it("asks for the code when none was entered", () => {
      const [form] = pairingAfter(
        web,
        actions.pairingFormChanged({ address: desktop }),
        actions.pairingSubmitted(),
        checked(false),
      );
      expect(form.status).toEqual({ kind: "codeMissing" });
    });
  });

  describe("when the server has accounts", () => {
    it("fills in the sign-in form and opens the account settings screen", () => {
      const [, effects] = pairingAfter(web, ...submitted, checked(true));
      expect(effects).toEqual([
        {
          type: "dispatch",
          action: actions.signInFormChanged({
            serverChoice: "own",
            ownServerUrl: desktop,
          }),
        },
        {
          type: "dispatch",
          action: actions.navigated({ type: "openAccountSettings" }),
        },
      ]);
    });

    it("returns to idle, since the sign-in form takes over", () => {
      const [form] = pairingAfter(web, ...submitted, checked(true));
      expect(form.status).toEqual({ kind: "idle" });
    });
  });

  it("ignores the answer of a server it no longer waits for", () => {
    const [, effects] = pairingAfter(
      web,
      ...submitted,
      actions.pairingServerChecked("http://10.0.0.2:8787", {
        accounts: false,
        open_signup: false,
        sends_email: false,
      }),
    );
    expect(effects).toEqual([]);
  });

  it("connects to the server once it gives its token", () => {
    const [, effects] = pairingAfter(
      web,
      ...submitted,
      checked(false),
      actions.pairingCodeClaimed(desktop, { token: "launch-token" }),
    );
    expect(effects).toEqual([
      {
        type: "connectPairedServer",
        server: { serverUrl: desktop, token: "launch-token" },
      },
    ]);
  });

  it("keeps a failure to show it", () => {
    const [form] = pairingAfter(
      web,
      ...submitted,
      actions.pairingFailed(failure),
    );
    expect(form.status).toEqual({ kind: "failed", failure });
  });

  describe("when a scan is asked for", () => {
    it("asks the platform's scanner on the mobile app", () => {
      const [, effects] = pairingAfter(mobile, actions.pairingScanRequested());
      expect(effects).toEqual([{ type: "scanPairingCode" }]);
    });

    it("leaves the reading to the camera view elsewhere", () => {
      const [, effects] = pairingAfter(web, actions.pairingScanRequested());
      expect(effects).toEqual([]);
    });

    it("shows that it is scanning", () => {
      const [form] = pairingAfter(web, actions.pairingScanRequested());
      expect(form.status).toEqual({ kind: "scanning" });
    });

    it("returns to idle when the camera is closed", () => {
      const [form] = pairingAfter(
        web,
        actions.pairingScanRequested(),
        actions.pairingScanCancelled("closed"),
      );
      expect(form.status).toEqual({ kind: "idle" });
    });

    it("says when the camera could not be used", () => {
      const [form] = pairingAfter(
        mobile,
        actions.pairingScanRequested(),
        actions.pairingScanCancelled("cameraUnavailable"),
      );
      expect(form.status).toEqual({ kind: "cameraUnavailable" });
    });
  });

  describe("when a QR code is read", () => {
    it("pairs with the server it names", () => {
      const [, effects] = pairingAfter(
        web,
        actions.pairingScanRequested(),
        actions.pairingCodeScanned(`${desktop}/#pair=123456`),
      );
      expect(effects).toEqual([
        { type: "checkPairingServer", serverUrl: desktop },
      ]);
    });

    it("fills in the code it holds", () => {
      const [form] = pairingAfter(
        web,
        actions.pairingScanRequested(),
        actions.pairingCodeScanned(`${desktop}/#pair=123456`),
      );
      expect(form.code).toBe("123456");
    });

    it("says when it holds no address", () => {
      const [form] = pairingAfter(
        web,
        actions.pairingScanRequested(),
        actions.pairingCodeScanned("hello there"),
      );
      expect(form.status).toEqual({ kind: "unrecognizedQrCode" });
    });
  });
});
