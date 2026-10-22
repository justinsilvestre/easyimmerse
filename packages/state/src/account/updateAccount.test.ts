import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import type { Effect } from "../app/effect.ts";
import { initialAppState } from "../app/update.ts";
import type { ServerState } from "../server/serverState.ts";
import {
  confirmationEmailRequestId,
  principalRefresh,
} from "./confirmationEmail.ts";
import { deleteSessionRequestId } from "./devices.ts";
import {
  type AccountState,
  accountFeature,
  updateAccount,
} from "./updateAccount.ts";
import { logOutRequestId } from "./updateSignIn.ts";

const cloudUrl = "https://cloud.example.com";

const offline: ServerState = { config: null, cloudUrl: null };

const withCloud: ServerState = { config: null, cloudUrl };

const ownServer = "https://books.example.org";

const connected: ServerState = {
  config: { serverUrl: ownServer, token: "session-token" },
  cloudUrl: null,
};

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
    sends_email: false,
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

  describe("when the person forgets their password", () => {
    const mailing = actions.serverAuthInfoReceived(ownServer, {
      accounts: true,
      open_signup: true,
      sends_email: true,
    });

    it("asks the server what it offers", () => {
      const [, effects] = accountAfter(
        offline,
        filledIn,
        actions.passwordResetAsked(),
      );
      expect(effects).toEqual([
        { type: "fetchServerAuthInfo", serverUrl: ownServer },
      ]);
    });

    it("asks for a reset link once a server that sends email answers", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        actions.passwordResetAsked(),
        mailing,
      );
      expect(account.signInForm.passwordReset).toEqual({ kind: "editing" });
    });

    it("tells that a server without email cannot reset the password", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        actions.passwordResetAsked(),
        answered(true, true),
      );
      expect(account.signInForm.status).toEqual({
        kind: "passwordResetUnavailable",
      });
    });

    it("tells nothing of email on a server without accounts", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        actions.passwordResetAsked(),
        answered(false, false),
      );
      expect(account.signInForm.status).toEqual({ kind: "idle" });
    });

    it("asks for a reset link at once on a server it has asked already", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        mailing,
        actions.passwordResetAsked(),
      );
      expect(account.signInForm.passwordReset).toEqual({ kind: "editing" });
    });

    it("asks the server to mail the link to the address", () => {
      const [, effects] = accountAfter(
        offline,
        filledIn,
        mailing,
        actions.passwordResetAsked(),
        actions.passwordResetSubmitted(),
      );
      expect(effects).toEqual([
        {
          type: "requestPasswordReset",
          serverUrl: ownServer,
          email: "someone@example.com",
        },
      ]);
    });

    it("keeps that the link is on its way", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        mailing,
        actions.passwordResetAsked(),
        actions.passwordResetSubmitted(),
        actions.passwordResetAnswered({ ok: true, data: null }),
      );
      expect(account.signInForm.passwordReset).toEqual({ kind: "sent" });
    });

    it("turns back to logging in when the server changes", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        mailing,
        actions.passwordResetAsked(),
        actions.signInFormChanged({ ownServerUrl: "https://else.example" }),
      );
      expect(account.signInForm.passwordReset).toBeNull();
    });

    it("turns back to logging in when the person asks to", () => {
      const [account] = accountAfter(
        offline,
        filledIn,
        mailing,
        actions.passwordResetAsked(),
        actions.passwordResetLeft(),
      );
      expect(account.signInForm.passwordReset).toBeNull();
    });
  });

  describe("when the app opens with a confirmation link", () => {
    const opened = actions.mailedLinkOpened({
      kind: "confirmEmail",
      token: "t1",
    });

    it("opens the Account settings", () => {
      const [, effects] = accountAfter(connected, opened);
      expect(effects).toContainEqual({
        type: "dispatch",
        action: actions.navigated({ type: "openAccountSettings" }),
      });
    });

    it("confirms the address on the connected server", () => {
      const [, effects] = accountAfter(connected, opened);
      expect(effects).toContainEqual({
        type: "confirmEmail",
        serverUrl: ownServer,
        token: "t1",
      });
    });

    it("confirms the address on the official server while offline", () => {
      const [, effects] = accountAfter(withCloud, opened);
      expect(effects).toContainEqual({
        type: "confirmEmail",
        serverUrl: cloudUrl,
        token: "t1",
      });
    });

    it("waits for the address of the server when it knows of none", () => {
      const [account] = accountAfter(offline, opened);
      expect(account.mailedLink?.status).toEqual({ kind: "idle" });
    });

    it("confirms the address on the server whose address is typed", () => {
      const [, effects] = accountAfter(
        offline,
        opened,
        actions.mailedLinkFormChanged({ serverAddress: ownServer }),
        actions.mailedLinkSubmitted(),
      );
      expect(effects).toEqual([
        { type: "confirmEmail", serverUrl: ownServer, token: "t1" },
      ]);
    });

    it("keeps that the address is confirmed", () => {
      const [account] = accountAfter(
        withCloud,
        opened,
        actions.emailConfirmationAnswered({ ok: true, data: null }),
      );
      expect(account.mailedLink?.status).toEqual({ kind: "done" });
    });

    it("fetches the connected account anew once its address is confirmed", () => {
      const [, effects] = accountAfter(
        connected,
        opened,
        actions.emailConfirmationAnswered({ ok: true, data: null }),
      );
      expect(effects).toEqual([principalRefresh]);
    });
  });

  describe("when the app opens with a reset link", () => {
    const opened = actions.mailedLinkOpened({
      kind: "resetPassword",
      token: "t1",
    });

    const chosen = actions.mailedLinkFormChanged({ password: "new horse" });

    it("waits for the new password", () => {
      const [, effects] = accountAfter(withCloud, opened);
      expect(effects).toEqual([
        {
          type: "dispatch",
          action: actions.navigated({ type: "openAccountSettings" }),
        },
      ]);
    });

    it("sets the new password on the official server", () => {
      const [, effects] = accountAfter(
        withCloud,
        opened,
        chosen,
        actions.mailedLinkSubmitted(),
      );
      expect(effects).toEqual([
        {
          type: "setNewPassword",
          serverUrl: cloudUrl,
          token: "t1",
          password: "new horse",
        },
      ]);
    });

    it("connects to the server with the session it opens", () => {
      const [, effects] = accountAfter(
        withCloud,
        opened,
        chosen,
        actions.mailedLinkSubmitted(),
        actions.newPasswordAnswered(cloudUrl, { ok: true, data: session }),
      );
      expect(effects).toEqual([
        {
          type: "connectToServer",
          server: { serverUrl: cloudUrl, token: "session-token" },
        },
      ]);
    });

    it("keeps why setting the password failed", () => {
      const failure = { status: 400, code: "invalid_link", message: "" };
      const [account] = accountAfter(
        withCloud,
        opened,
        chosen,
        actions.mailedLinkSubmitted(),
        actions.newPasswordAnswered(cloudUrl, { ok: false, error: failure }),
      );
      expect(account.mailedLink?.status).toEqual({ kind: "failed", failure });
    });
  });

  describe("when the person logs out a device", () => {
    const request = { kind: "deleteSession", sessionId: "s2" } as const;

    it("asks the server to end its session", () => {
      const [, effects] = accountAfter(
        connected,
        actions.deviceLogOutRequested("s2", false),
      );
      expect(effects).toEqual([
        {
          type: "sendRequest",
          id: deleteSessionRequestId("s2"),
          request: { ...request, isCurrent: false },
        },
      ]);
    });

    it("disconnects once this device's session has ended", () => {
      const [, effects] = accountAfter(
        connected,
        actions.requestSettled(
          deleteSessionRequestId("s2"),
          { ...request, isCurrent: true },
          { ok: true, data: undefined },
        ),
      );
      expect(effects).toEqual([{ type: "disconnectFromServer" }]);
    });

    it("keeps why logging out another device failed", () => {
      const failure = { status: 500, message: "Disk full." };
      const [account] = accountAfter(
        connected,
        actions.requestSettled(
          deleteSessionRequestId("s2"),
          { ...request, isCurrent: false },
          { ok: false, error: failure },
        ),
      );
      expect(account.devices.logOutFailure).toEqual(failure);
    });

    it("counts a device that is already logged out as logged out", () => {
      const [account] = accountAfter(
        connected,
        actions.requestSettled(
          deleteSessionRequestId("s2"),
          { ...request, isCurrent: false },
          { ok: false, error: { status: 404, message: "" } },
        ),
      );
      expect(account.devices.logOutFailure).toBeNull();
    });
  });

  describe("when the person asks for another confirmation link", () => {
    const request = { kind: "requestConfirmationEmail" } as const;

    const settled = (outcome: Parameters<typeof actions.requestSettled>[2]) =>
      actions.requestSettled(confirmationEmailRequestId, request, outcome);

    it("asks the server to mail it", () => {
      const [, effects] = accountAfter(
        connected,
        actions.confirmationEmailRequested(),
      );
      expect(effects).toEqual([
        { type: "sendRequest", id: confirmationEmailRequestId, request },
      ]);
    });

    it("keeps that it was sent", () => {
      const [account] = accountAfter(
        connected,
        settled({ ok: true, data: undefined }),
      );
      expect(account.confirmationEmail).toEqual({ kind: "sent" });
    });

    it("keeps how long the server asks to wait", () => {
      const [account] = accountAfter(
        connected,
        settled({
          ok: false,
          error: { status: 429, message: "", retryAfterSeconds: 42 },
        }),
      );
      expect(account.confirmationEmail).toEqual({
        kind: "tooSoon",
        retryAfterSeconds: 42,
      });
    });

    it("fetches the account anew when its address is confirmed already", () => {
      const [, effects] = accountAfter(
        connected,
        settled({
          ok: false,
          error: { status: 409, code: "already_confirmed", message: "" },
        }),
      );
      expect(effects).toEqual([principalRefresh]);
    });
  });
});
