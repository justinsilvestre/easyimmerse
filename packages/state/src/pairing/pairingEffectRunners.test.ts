import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { selectPairingForm } from "./pairingSelectors.ts";

const desktop = "http://192.168.1.5:8787";

/** A store whose pairing form was sent to the desktop app, which answered that it has no accounts. */
async function claimingStore() {
  const effects = createRecordingEffects();
  const store = createAppStore(effects, createFakeServerStoreParts());
  store.dispatch(
    actions.pairingFormChanged({ address: desktop, code: "123456" }),
  );
  store.dispatch(actions.pairingSubmitted());
  effects.resolveServerAuthInfo({
    ok: true,
    data: { accounts: false, open_signup: false },
  });
  await vi.waitFor(() =>
    expect(effects.calls).toContainEqual(
      expect.objectContaining({ type: "claimPairingCode" }),
    ),
  );
  return { effects, store };
}

/** A mobile app's store whose pairing form asked the platform's scanner for a QR code. */
function scanningMobileStore() {
  const effects = createRecordingEffects();
  const store = createAppStore(
    effects,
    createFakeServerStoreParts({
      serverUrl: "http://127.0.0.1:1",
      token: "t",
      bundledIn: "mobile",
    }),
  );
  store.dispatch(actions.pairingScanRequested());
  return { effects, store };
}

describe("pairingEffectRunners", () => {
  it("claims the code at the server", async () => {
    const { effects } = await claimingStore();
    expect(effects.calls).toContainEqual({
      type: "claimPairingCode",
      serverUrl: desktop,
      code: "123456",
    });
  });

  it("connects the app with the token the server gave", async () => {
    const { effects } = await claimingStore();
    effects.resolvePairingClaim({ ok: true, data: { token: "launch-token" } });
    await vi.waitFor(() =>
      expect(effects.calls).toContainEqual({
        type: "connectToServer",
        server: { serverUrl: desktop, token: "launch-token" },
      }),
    );
  });

  it("shows why a claim failed", async () => {
    const { effects, store } = await claimingStore();
    effects.resolvePairingClaim({
      ok: false,
      error: { status: 404, code: "pairing_code_invalid", message: "" },
    });
    await vi.waitFor(() =>
      expect(selectPairingForm(store.getState()).message).toBe(
        "This code is wrong or has expired. Enter the code that the desktop app shows now.",
      ),
    );
  });

  it("shows a connection the device could not keep", async () => {
    const { effects, store } = await claimingStore();
    effects.refuseConnections();
    effects.resolvePairingClaim({ ok: true, data: { token: "launch-token" } });
    await vi.waitFor(() =>
      expect(selectPairingForm(store.getState()).status).toBe("failed"),
    );
  });

  it("opens the sign-in form for a server with accounts", async () => {
    const effects = createRecordingEffects();
    const store = createAppStore(effects, createFakeServerStoreParts());
    store.dispatch(actions.pairingFormChanged({ address: desktop }));
    store.dispatch(actions.pairingSubmitted());
    effects.resolveServerAuthInfo({
      ok: true,
      data: { accounts: true, open_signup: false },
    });
    await vi.waitFor(() =>
      expect(store.getState().app.account.signInForm.ownServerUrl).toBe(
        desktop,
      ),
    );
  });

  it("reads what the mobile app's scanner scanned", async () => {
    const { effects, store } = scanningMobileStore();
    effects.resolvePairingScan({
      kind: "read",
      text: `${desktop}/#pair=654321`,
    });
    await vi.waitFor(() =>
      expect(selectPairingForm(store.getState()).code).toBe("654321"),
    );
  });

  it("says when the mobile app's camera could not be used", async () => {
    const { effects, store } = scanningMobileStore();
    effects.resolvePairingScan({ kind: "cameraUnavailable" });
    await vi.waitFor(() =>
      expect(selectPairingForm(store.getState()).status).toBe(
        "cameraUnavailable",
      ),
    );
  });
});
