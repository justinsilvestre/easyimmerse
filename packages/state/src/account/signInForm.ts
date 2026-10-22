import type { ServerAuthInfo } from "@easyimmerse/types";
import type { RequestFailure } from "../server/serverRequest.ts";

/** Whether a person logs in to an account they have or signs up for a new one. */
export type SignInMode = "login" | "signup";

/** The server a person signs in to: the official easyImmerse server, or their own at the address they type. */
export type SignInServerChoice = "official" | "own";

/**
 * How far a sign-in has gone: not started, asking the server what it offers, sending the email and password, or failed.
 * Asked for a password reset, the form also asks the server what it offers, and learns that the server cannot send email.
 */
export type SignInStatus =
  | { kind: "idle" }
  | { kind: "checkingServer" }
  | { kind: "submitting" }
  | { kind: "failed"; failure: RequestFailure }
  | { kind: "checkingPasswordReset" }
  | { kind: "passwordResetUnavailable" };

/** How far the request for a mailed link that resets the password has gone. */
export type PasswordResetStatus =
  | { kind: "editing" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "failed"; failure: RequestFailure };

/** The form through which a person logs in to a server or signs up on it. */
export type SignInForm = {
  mode: SignInMode;
  /** The server chosen. While the app knows of no official server, the person's own server is used whatever this holds. */
  serverChoice: SignInServerChoice;
  ownServerUrl: string;
  email: string;
  password: string;
  status: SignInStatus;
  /** What the server asked last said about its accounts, under the address it was asked at. */
  serverAuthInfo: { serverUrl: string; info: ServerAuthInfo } | null;
  /** The request for a password reset link, while the form asks for one instead of logging in, or null. */
  passwordReset: PasswordResetStatus | null;
  /** Whether logging out waits for the person to confirm that the flashcards not yet saved are dropped. */
  isConfirmingLogOut: boolean;
};

/** The fields of the sign-in form that a person edits. */
export type SignInFields = Pick<
  SignInForm,
  "mode" | "serverChoice" | "ownServerUrl" | "email" | "password"
>;

/**
 * What a server offers for signing in: not known until it is asked, no accounts at all,
 * accounts that only an administrator creates, or accounts anyone may sign up for.
 */
export type ServerOffer = "unknown" | "noAccounts" | "signupClosed" | "open";

export const initialSignInForm: SignInForm = {
  mode: "login",
  serverChoice: "official",
  ownServerUrl: "",
  email: "",
  password: "",
  status: { kind: "idle" },
  serverAuthInfo: null,
  passwordReset: null,
  isConfirmingLogOut: false,
};

/** The address of the server the form signs in to, or null when the own server's address is not an HTTP or HTTPS URL. */
export function signInServerUrlOf(
  form: SignInForm,
  cloudUrl: string | null,
): string | null {
  if (cloudUrl !== null && form.serverChoice === "official") return cloudUrl;
  const typed = form.ownServerUrl.trim();
  return isHttpUrl(typed) ? typed : null;
}

/** What the server at the address offers, as far as the form has learned. */
export function serverOfferOf(
  form: SignInForm,
  serverUrl: string | null,
): ServerOffer {
  const known = form.serverAuthInfo;
  if (known === null || known.serverUrl !== serverUrl) return "unknown";
  if (!known.info.accounts) return "noAccounts";
  return known.info.open_signup ? "open" : "signupClosed";
}

/** Whether a server with this offer lets a person sign in in the given mode. */
export function offersMode(offer: ServerOffer, mode: SignInMode): boolean {
  return offer === "open" || (offer === "signupClosed" && mode === "login");
}

/** Whether the form can be sent: it is not busy, it names a server that may offer its mode, and both fields are filled in. */
export function canSubmitSignIn(
  form: SignInForm,
  cloudUrl: string | null,
): boolean {
  const serverUrl = signInServerUrlOf(form, cloudUrl);
  const offer = serverOfferOf(form, serverUrl);
  return (
    !isBusy(form) &&
    serverUrl !== null &&
    (offer === "unknown" || offersMode(offer, form.mode)) &&
    form.email.trim() !== "" &&
    form.password !== ""
  );
}

/** Whether the form waits for a server's answer. */
export function isBusy(form: SignInForm): boolean {
  return (
    form.status.kind === "checkingServer" ||
    form.status.kind === "submitting" ||
    form.status.kind === "checkingPasswordReset" ||
    form.passwordReset?.kind === "sending"
  );
}

/** Whether the person can ask for a password reset link: the form logs in to a server it names and waits for nothing. */
export function canAskPasswordReset(
  form: SignInForm,
  cloudUrl: string | null,
): boolean {
  return (
    form.mode === "login" &&
    form.passwordReset === null &&
    !isBusy(form) &&
    signInServerUrlOf(form, cloudUrl) !== null
  );
}

/** Whether the request for a password reset link can be sent: the form asks for one, waits for nothing, and has an email address. */
export function canSubmitPasswordReset(
  form: SignInForm,
  cloudUrl: string | null,
): boolean {
  return (
    form.passwordReset !== null &&
    !isBusy(form) &&
    signInServerUrlOf(form, cloudUrl) !== null &&
    form.email.trim() !== ""
  );
}

/** Whether the text starts as an HTTP or HTTPS address with a host and holds no spaces. */
export function isHttpUrl(text: string): boolean {
  return /^https?:\/\/[^\s/?#]+[^\s]*$/i.test(text);
}
