import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isSettled } from "../server/isSettled.ts";
import type { ServerState } from "../server/serverState.ts";
import {
  canSubmitSignIn,
  isBusy,
  offersMode,
  type SignInForm,
  serverOfferOf,
  signInServerUrlOf,
} from "./signInForm.ts";

/** The id of the request that ends the app's session. */
export const logOutRequestId = "account/logOut";

/**
 * Keeps the sign-in form, asks the chosen server what it offers before the first attempt on it, sends the email and password,
 * and connects the app to the server once it opens a session.
 * Logging out ends the session on the server and then disconnects the app, whether or not the server could be reached.
 */
export function updateSignIn(
  form: SignInForm,
  action: AppAction,
  { server, operations }: Pick<ReadableState, "server" | "operations">,
) {
  switch (action.type) {
    case "signInFormChanged":
      if (isBusy(form)) return updated(form);
      return updated({ ...form, ...action.changes, status: { kind: "idle" } });
    case "signInSubmitted":
      return submitted(form, server);
    case "serverAuthInfoReceived":
      return infoReceived(form, action, server);
    case "signInSucceeded":
      return updated(form, {
        type: "connectToServer",
        server: { serverUrl: action.serverUrl, token: action.session.token },
      });
    case "signInFailed":
      return updated({
        ...form,
        status: { kind: "failed", failure: action.failure },
      });
    case "signOutRequested":
      if (selectIsRequestInFlight({ operations }, logOutRequestId))
        return updated(form);
      return updated(form, {
        type: "sendRequest",
        id: logOutRequestId,
        request: { kind: "logOut" },
      });
    case "requestSettled":
      return isSettled(action, logOutRequestId, "logOut")
        ? updated(form, { type: "disconnectFromServer" })
        : updated(form);
    default:
      return updated(form);
  }
}

function submitted(form: SignInForm, server: ServerState) {
  const serverUrl = signInServerUrlOf(form, server.cloudUrl);
  if (serverUrl === null || !canSubmitSignIn(form, server.cloudUrl))
    return updated(form);
  if (serverOfferOf(form, serverUrl) === "unknown")
    return updated(
      { ...form, status: { kind: "checkingServer" } },
      { type: "fetchServerAuthInfo", serverUrl },
    );
  return sending(form, serverUrl);
}

function infoReceived(
  before: SignInForm,
  action: Extract<AppAction, { type: "serverAuthInfoReceived" }>,
  server: ServerState,
) {
  const form = {
    ...before,
    serverAuthInfo: { serverUrl: action.serverUrl, info: action.info },
  };
  const serverUrl = signInServerUrlOf(form, server.cloudUrl);
  const isAwaited =
    form.status.kind === "checkingServer" && serverUrl === action.serverUrl;
  if (!isAwaited) return updated(form);
  return offersMode(serverOfferOf(form, serverUrl), form.mode)
    ? sending(form, action.serverUrl)
    : updated({ ...form, status: { kind: "idle" } });
}

function sending(form: SignInForm, serverUrl: string) {
  const { mode, email, password } = form;
  return updated(
    { ...form, status: { kind: "submitting" } },
    { type: "createSession", attempt: { serverUrl, mode, email, password } },
  );
}
