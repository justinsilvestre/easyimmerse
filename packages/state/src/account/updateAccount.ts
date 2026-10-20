import type { AppAction } from "../app/appAction.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isSettled } from "../server/isSettled.ts";
import type { ServerState } from "../server/serverState.ts";
import {
  canSubmitSignIn,
  initialSignInForm,
  isBusy,
  offersMode,
  type SignInForm,
  serverOfferOf,
  signInServerUrlOf,
} from "./signInForm.ts";

/** The account slice: the form through which a person signs in. Who is signed in comes from the server, not from here. */
export type AccountState = { signInForm: SignInForm };

/** The id of the request that ends the app's session. */
export const logOutRequestId = "account/logOut";

/**
 * Keeps the sign-in form, asks the chosen server what it offers before the first attempt on it, sends the email and password,
 * and connects the app to the server once it opens a session.
 * Logging out ends the session on the server and then disconnects the app, whether or not the server could be reached.
 */
export const updateAccount: FeatureUpdate<
  AccountState,
  "server" | "operations"
> = (account, action, { server, operations }) => {
  const form = account.signInForm;
  switch (action.type) {
    case "signInFormChanged":
      if (isBusy(form)) return updated(account);
      return updated(
        withForm({ ...form, ...action.changes, status: { kind: "idle" } }),
      );
    case "signInSubmitted":
      return submitted(account, server);
    case "serverAuthInfoReceived":
      return infoReceived(account, action, server);
    case "signInSucceeded":
      return updated(account, {
        type: "connectToServer",
        server: { serverUrl: action.serverUrl, token: action.session.token },
      });
    case "signInFailed":
      return updated(
        withForm({
          ...form,
          status: { kind: "failed", failure: action.failure },
        }),
      );
    case "signOutRequested":
      if (selectIsRequestInFlight({ operations }, logOutRequestId))
        return updated(account);
      return updated(account, {
        type: "sendRequest",
        id: logOutRequestId,
        request: { kind: "logOut" },
      });
    case "requestSettled":
      return isSettled(action, logOutRequestId, "logOut")
        ? updated(account, { type: "disconnectFromServer" })
        : updated(account);
    default:
      return updated(account);
  }
};

/** The account as a feature. */
export const accountFeature: Feature<AccountState, "server" | "operations"> = {
  initialState: { signInForm: initialSignInForm },
  update: updateAccount,
};

function submitted(account: AccountState, server: ServerState) {
  const form = account.signInForm;
  const serverUrl = signInServerUrlOf(form, server.cloudUrl);
  if (serverUrl === null || !canSubmitSignIn(form, server.cloudUrl))
    return updated(account);
  if (serverOfferOf(form, serverUrl) === "unknown")
    return updated(withForm({ ...form, status: { kind: "checkingServer" } }), {
      type: "fetchServerAuthInfo",
      serverUrl,
    });
  return sending(form, serverUrl);
}

function infoReceived(
  account: AccountState,
  action: Extract<AppAction, { type: "serverAuthInfoReceived" }>,
  server: ServerState,
) {
  const form = {
    ...account.signInForm,
    serverAuthInfo: { serverUrl: action.serverUrl, info: action.info },
  };
  const serverUrl = signInServerUrlOf(form, server.cloudUrl);
  const isAwaited =
    form.status.kind === "checkingServer" && serverUrl === action.serverUrl;
  if (!isAwaited) return updated(withForm(form));
  return offersMode(serverOfferOf(form, serverUrl), form.mode)
    ? sending(form, action.serverUrl)
    : updated(withForm({ ...form, status: { kind: "idle" } }));
}

function sending(form: SignInForm, serverUrl: string) {
  const { mode, email, password } = form;
  return updated(withForm({ ...form, status: { kind: "submitting" } }), {
    type: "createSession",
    attempt: { serverUrl, mode, email, password },
  });
}

function withForm(signInForm: SignInForm): AccountState {
  return { signInForm };
}
