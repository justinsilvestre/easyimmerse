import type { AppAction } from "../app/appAction.ts";
import type { ReadableState } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { selectFailedSaves } from "../flashcards/failedSave.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { isAborted } from "../server/isAborted.ts";
import { isSettled } from "../server/isSettled.ts";
import type { RequestOutcome } from "../server/serverRequest.ts";
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
import {
  passwordResetAnswered,
  passwordResetAsked,
  passwordResetDecided,
  passwordResetSubmitted,
  signInFieldsChanged,
} from "./updatePasswordReset.ts";

/** The id of the request that ends the app's session. */
export const logOutRequestId = "account/logOut";

/** The id of the request that logs the native app's built-in server in to a remote. */
export const linkRequestId = "account/link";

/** The id of the request that logs the native app's built-in server out of its remote. */
export const unlinkRequestId = "account/unlink";

/**
 * Keeps the sign-in form, asks the chosen server what it offers before the first attempt on it, sends the email and password,
 * and connects the app to the server once it opens a session.
 * Logging out ends the session on the server and then disconnects the app, whether or not the server could be reached.
 * While flashcards have not been saved to the server, logging out first waits for the person to confirm that they are dropped.
 * In the native app, the built-in server logs in to the remote and keeps the session itself, so the app stays connected to the built-in server,
 * and logging out asks the built-in server to log out of the remote.
 * Asked for a password reset, the form asks a server that sends email to mail a link to the address instead.
 */
export function updateSignIn(
  form: SignInForm,
  action: AppAction,
  { server, operations }: Pick<ReadableState, "server" | "operations">,
) {
  switch (action.type) {
    case "signInFormChanged":
      if (isBusy(form)) return updated(form);
      return updated(signInFieldsChanged(form, action.changes));
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
      return signOutRequested(form, server, operations);
    case "logOutConfirmed":
      return logOut({ ...form, isConfirmingLogOut: false }, operations);
    case "logOutCancelled":
      return updated({ ...form, isConfirmingLogOut: false });
    case "relinkRequested":
      if (isBusy(form)) return updated(form);
      return updated(relinkForm(action, server));
    case "passwordResetAsked":
      return passwordResetAsked(form, server);
    case "passwordResetSubmitted":
      return passwordResetSubmitted(form, server);
    case "passwordResetAnswered":
      return updated(passwordResetAnswered(form, action.outcome));
    case "passwordResetLeft":
      if (isBusy(form)) return updated(form);
      return updated({
        ...form,
        passwordReset: null,
        status: { kind: "idle" },
      });
    case "requestSettled":
      if (isSettled(action, linkRequestId, "linkSyncRemote"))
        return updated(linkSettled(form, action.outcome));
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
  return sending(form, serverUrl, server);
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
  if (serverUrl !== action.serverUrl) return updated(form);
  if (form.status.kind === "checkingPasswordReset")
    return updated(passwordResetDecided(form, action.info));
  if (form.status.kind !== "checkingServer") return updated(form);
  return offersMode(serverOfferOf(form, serverUrl), form.mode)
    ? sending(form, action.serverUrl, server)
    : updated({ ...form, status: { kind: "idle" } });
}

function sending(form: SignInForm, serverUrl: string, server: ServerState) {
  const { mode, email, password } = form;
  const submitting = { ...form, status: { kind: "submitting" } } as const;
  if (server.config?.bundledIn !== undefined)
    return updated(submitting, {
      type: "sendRequest",
      id: linkRequestId,
      request: {
        kind: "linkSyncRemote",
        request: { server_url: serverUrl, mode, email, password },
      },
    });
  return updated(submitting, {
    type: "createSession",
    attempt: { serverUrl, mode, email, password },
  });
}

function signOutRequested(
  form: SignInForm,
  server: ServerState,
  operations: ReadableState["operations"],
) {
  const isLinked = server.config?.bundledIn !== undefined;
  if (isLinked)
    return sendOnce(form, operations, unlinkRequestId, "unlinkSyncRemote");
  if (selectFailedSaves({ operations }).length > 0)
    return updated({ ...form, isConfirmingLogOut: true });
  return logOut(form, operations);
}

function logOut(form: SignInForm, operations: ReadableState["operations"]) {
  return sendOnce(form, operations, logOutRequestId, "logOut");
}

function sendOnce(
  form: SignInForm,
  operations: ReadableState["operations"],
  id: string,
  kind: "logOut" | "unlinkSyncRemote",
) {
  if (selectIsRequestInFlight({ operations }, id)) return updated(form);
  return updated(form, { type: "sendRequest", id, request: { kind } });
}

function linkSettled(
  form: SignInForm,
  outcome: RequestOutcome<"linkSyncRemote">,
): SignInForm {
  if (outcome.ok || isAborted(outcome))
    return { ...form, password: "", status: { kind: "idle" } };
  return { ...form, status: { kind: "failed", failure: outcome.error } };
}

/** The form filled in to log in again to the remote that logged the built-in server out. */
function relinkForm(
  { serverUrl, email }: Extract<AppAction, { type: "relinkRequested" }>,
  server: ServerState,
): SignInForm {
  return {
    ...initialSignInForm,
    serverChoice: serverUrl === server.cloudUrl ? "official" : "own",
    ownServerUrl: serverUrl,
    email,
  };
}
