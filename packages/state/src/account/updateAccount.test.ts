import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { initialAppState } from "../app/update.ts";
import type { ServerState } from "../server/serverState.ts";
import {
  type AccountState,
  accountFeature,
  logOutRequestId,
  updateAccount,
} from "./updateAccount.ts";

const cloudUrl = "https://cloud.example.com";

const offline: ServerState = { config: null, cloudUrl: null };

const withCloud: ServerState = { config: null, cloudUrl };

const ownServer = "https://books.example.org";

const session = {
  token: "session-token",
  user: {
    id: "u1",
    email: "someone@example.com",
    role: "library_user",
    created_at_ms: 0,
  },
} as const;

/** The account after the actions, and the effects of the last one. */
function accountAfter(
  server: ServerState,
  ...accountActions: AppAction[]
): readonly [AccountState, readonly Effect[]] {
  const deps = { server, operations: initialAppState.operations };
  return accountActions.reduce<readonly [AccountState, readonly Effect[]]>(
    ([account], action) => updateAccount(account, action, deps),
    [accountFeature.initialState, []],
  );
}

const filledIn = actions.signInFormChanged({
  ownServerUrl: ownServer,
  email: "someone@example.com",
  password: "correct horse",
});

const answered = (accounts: boolean, openSignup: boolean) =>
  actions.serverAuthInfoReceived(ownServer, {
    accounts,
    open_signup: openSignup,
  });

const signupMode = actions.signInFormChanged({ mode: "signup" });

describe("updateAccount", () => {
  describe("when the form is sent for the first time", () => {
    it("asks the server what it offers", () => {
      const [, effects] = accountAfter(
        offline,
        filledIn,
        actions.signInSubmitted(),
      );
      expect(effects).toEqual([
        { type: "fetchServerAuthInfo", serverUrl: ownServer },
      ]);
    });

    it("asks the official server when it is chosen", () => {
      const [, effects] = accountAfter(
        withCloud,
        filledIn,
        actions.signInSubmitted(),
      );
      expect(effects).toEqual([
        { type: "fetchServerAuthInfo", serverUrl: cloudUrl },
      ]);
    });

    it("shows that it is checking the server", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        actions.signInSubmitted(),
      );
      expect(account.signInForm.status).toEqual({ kind: "checkingServer" });
    });
  });

  it("does nothing for a form that cannot be sent", () => {
    const [, effects] = accountAfter(offline, actions.signInSubmitted());
    expect(effects).toEqual([]);
  });

  describe("when the server answers", () => {
    it("logs in on a server with accounts", () => {
      const [, effects] = accountAfter(
        offline,
        filledIn,
        actions.signInSubmitted(),
        answered(true, false),
      );
      expect(effects).toEqual([
        {
          type: "createSession",
          attempt: {
            serverUrl: ownServer,
            mode: "login",
            email: "someone@example.com",
            password: "correct horse",
          },
        },
      ]);
    });

    it("shows that it is sending the form", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        actions.signInSubmitted(),
        answered(true, true),
      );
      expect(account.signInForm.status).toEqual({ kind: "submitting" });
    });

    it("sends no sign-up to a server whose sign-up is closed", () => {
      const [, effects] = accountAfter(
        offline,
        filledIn,
        signupMode,
        actions.signInSubmitted(),
        answered(true, false),
      );
      expect(effects).toEqual([]);
    });

    it("returns to idle when the server does not offer the mode", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        actions.signInSubmitted(),
        answered(false, false),
      );
      expect(account.signInForm.status).toEqual({ kind: "idle" });
    });
  });

  it("signs in at once on a server it has asked already", () => {
    const [, effects] = accountAfter(
      offline,
      filledIn,
      actions.signInSubmitted(),
      answered(true, true),
      actions.signInFailed({
        status: 401,
        code: "invalid_credentials",
        message: "",
      }),
      actions.signInSubmitted(),
    );
    expect(effects).toMatchObject([{ type: "createSession" }]);
  });

  it("connects to the server once it opens a session", () => {
    const [, effects] = accountAfter(
      offline,
      actions.signInSucceeded(ownServer, session),
    );
    expect(effects).toEqual([
      {
        type: "connectToServer",
        server: { serverUrl: ownServer, token: "session-token" },
      },
    ]);
  });

  it("keeps the failure of an attempt", () => {
    const failure = { status: 409, code: "email_taken", message: "" };
    const [account] = accountAfter(
      offline,
      filledIn,
      actions.signInSubmitted(),
      actions.signInFailed(failure),
    );
    expect(account.signInForm.status).toEqual({ kind: "failed", failure });
  });

  it("forgets the failure once the form changes", () => {
    const [account] = accountAfter(
      offline,
      filledIn,
      actions.signInSubmitted(),
      actions.signInFailed({ status: "NETWORK", message: "" }),
      actions.signInFormChanged({ password: "another" }),
    );
    expect(account.signInForm.status).toEqual({ kind: "idle" });
  });

  it("ignores changes while the form is being sent", () => {
    const [account] = accountAfter(
      offline,
      filledIn,
      actions.signInSubmitted(),
      actions.signInFormChanged({ email: "else@example.com" }),
    );
    expect(account.signInForm.email).toBe("someone@example.com");
  });

  it("ends the session on the server when asked to log out", () => {
    const [, effects] = accountAfter(offline, actions.signOutRequested());
    expect(effects).toEqual([
      { type: "sendRequest", id: logOutRequestId, request: { kind: "logOut" } },
    ]);
  });

  it("disconnects once the server has answered the log-out", () => {
    const [, effects] = accountAfter(
      offline,
      actions.requestSettled(
        logOutRequestId,
        { kind: "logOut" },
        { ok: false, error: { status: "NETWORK", message: "" } },
      ),
    );
    expect(effects).toEqual([{ type: "disconnectFromServer" }]);
  });
});
