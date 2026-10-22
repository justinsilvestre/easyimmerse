import type { ServerAuthInfo } from "@easyimmerse/types";
import { updated } from "../app/updated.ts";
import type { ServerState } from "../server/serverState.ts";
import type { SignInOutcome } from "./signInAttempt.ts";
import {
  canAskPasswordReset,
  canSubmitPasswordReset,
  type SignInFields,
  type SignInForm,
  signInServerUrlOf,
} from "./signInForm.ts";

/**
 * Turns the form to asking for a password reset link once the chosen server is known to send email,
 * asking the server what it offers first when the form has not learned it yet.
 */
export function passwordResetAsked(form: SignInForm, server: ServerState) {
  const serverUrl = signInServerUrlOf(form, server.cloudUrl);
  if (serverUrl === null || !canAskPasswordReset(form, server.cloudUrl))
    return updated(form);
  const known = form.serverAuthInfo;
  if (known !== null && known.serverUrl === serverUrl)
    return updated(passwordResetDecided(form, known.info));
  return updated(
    { ...form, status: { kind: "checkingPasswordReset" } },
    { type: "fetchServerAuthInfo", serverUrl },
  );
}

/**
 * Turns the form to asking for a password reset link when the server sends email,
 * and otherwise keeps it logging in, telling why when the server has accounts but cannot mail them.
 */
export function passwordResetDecided(
  form: SignInForm,
  info: ServerAuthInfo,
): SignInForm {
  if (info.accounts && info.sends_email)
    return {
      ...form,
      status: { kind: "idle" },
      passwordReset: { kind: "editing" },
    };
  return {
    ...form,
    status: info.accounts
      ? { kind: "passwordResetUnavailable" }
      : { kind: "idle" },
  };
}

/** Asks the chosen server to mail a password reset link to the email address. */
export function passwordResetSubmitted(form: SignInForm, server: ServerState) {
  const serverUrl = signInServerUrlOf(form, server.cloudUrl);
  if (serverUrl === null || !canSubmitPasswordReset(form, server.cloudUrl))
    return updated(form);
  return updated(
    { ...form, passwordReset: { kind: "sending" } },
    { type: "requestPasswordReset", serverUrl, email: form.email.trim() },
  );
}

/** Keeps whether the server accepted the request for a password reset link. */
export function passwordResetAnswered(
  form: SignInForm,
  outcome: SignInOutcome<null>,
): SignInForm {
  if (form.passwordReset?.kind !== "sending") return form;
  return {
    ...form,
    passwordReset: outcome.ok
      ? { kind: "sent" }
      : { kind: "failed", failure: outcome.error },
  };
}

/**
 * Applies the person's changes to the form and forgets the last outcome.
 * While the form asks for a reset link, a change of server or mode turns it back to logging in, since the server's answer about email no longer applies.
 */
export function signInFieldsChanged(
  form: SignInForm,
  changes: Partial<SignInFields>,
): SignInForm {
  const next = { ...form, ...changes, status: { kind: "idle" } } as const;
  if (form.passwordReset === null) return next;
  const leavesReset =
    "mode" in changes || "serverChoice" in changes || "ownServerUrl" in changes;
  return {
    ...next,
    passwordReset: leavesReset ? null : { kind: "editing" },
  };
}
