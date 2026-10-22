import { describe, expect, it, vi } from "vitest";
import { actions } from "../app/appAction.ts";
import { createAppStore } from "../app/createAppStore.ts";
import { createFakeServerStoreParts } from "../app/createFakeServerStoreParts.ts";
import { createRecordingEffects } from "../platform/recordingEffects.ts";
import { recoverableWorkKey } from "../recovery/recoverableWork.ts";
import { selectSignInForm } from "./accountSelectors.ts";

const ownServer = "https://books.example.org";

const session = {
  token: "session-token",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "library_user",
    created_at_ms: 0,
    email_confirmed_at_ms: null,
  },
} as const;

/** A store whose sign-in form was sent to the person's own server. */
function submittedStore() {
  const effects = createRecordingEffects();
  const store = createAppStore(effects, createFakeServerStoreParts());
  store.dispatch(
    actions.signInFormChanged({
      ownServerUrl: ownServer,
      email: "someone@example.com",
      password: "correct horse",
    }),
  );
  store.dispatch(actions.signInSubmitted());
  return { effects, store };
}

async function signedIn(refusesConnections = false) {
  const { effects, store } = submittedStore();
  if (refusesConnections) effects.refuseConnections();
  effects.resolveServerAuthInfo({
    ok: true,
    data: { accounts: true, open_signup: true, sends_email: false },
  });
  await vi.waitFor(() =>
    expect(effects.calls).toContainEqual(
      expect.objectContaining({ type: "createSession" }),
    ),
  );
  effects.resolveSession({ ok: true, data: session });
  return { effects, store };
}

describe("accountEffectRunners", () => {
  it("connects the app to the server once the sign-in succeeds", async () => {
    const { effects } = await signedIn();
    await vi.waitFor(() =>
      expect(effects.calls).toContainEqual({
        type: "connectToServer",
        server: { serverUrl: ownServer, token: "session-token" },
      }),
    );
  });

  it("tells when the browser could not keep the sign-in", async () => {
    const { store } = await signedIn(true);
    await vi.waitFor(() =>
      expect(selectSignInForm(store.getState()).failureMessage).toBe(
        "The sign-in could not be saved in this browser.",
      ),
    );
  });

  it("shows why the server could not be asked", async () => {
    const { effects, store } = submittedStore();
    effects.resolveServerAuthInfo({
      ok: false,
      error: { status: "NETWORK", message: "Failed to fetch" },
    });
    await vi.waitFor(() =>
      expect(selectSignInForm(store.getState()).failureMessage).toBe(
        "Couldn't reach a server at https://books.example.org. Check the address and your connection.",
      ),
    );
  });

  it("disconnects the app once the server ends the session", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts({
      serverUrl: ownServer,
      token: "session-token",
    });
    const store = createAppStore(effects, server);
    store.dispatch(actions.signOutRequested());
    server.respond({ kind: "logOut" }, { ok: true, data: undefined });
    await vi.waitFor(() =>
      expect(effects.calls).toContainEqual({ type: "disconnectFromServer" }),
    );
  });

  it("forgets the account's unsaved work before disconnecting", async () => {
    const effects = createRecordingEffects();
    const server = createFakeServerStoreParts({
      serverUrl: ownServer,
      token: "session-token",
    });
    const store = createAppStore(effects, server);
    store.dispatch(actions.signOutRequested());
    server.respond({ kind: "logOut" }, { ok: true, data: undefined });
    await vi.waitFor(() =>
      expect(effects.calls.slice(-2)).toEqual([
        {
          type: "saveOnDevice",
          key: recoverableWorkKey,
          value: JSON.stringify({ saves: [], resends: [] }),
        },
        { type: "disconnectFromServer" },
      ]),
    );
  });
});
