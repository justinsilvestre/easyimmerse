import type { RequestFailure } from "../server/serverRequest.ts";
import { connectionNotKeptCode } from "./signInAttempt.ts";

const messagesByCode: Record<string, string> = {
  invalid_credentials: "Incorrect email address or password.",
  email_taken:
    "An account with this email address already exists. Log in instead.",
  password_too_short: "The password must be at least 8 characters long.",
  password_too_long: "The password is too long.",
  [connectionNotKeptCode]: "The sign-in could not be saved in this browser.",
  invalid_email: "This email address is not valid.",
  signup_closed: "This server does not let anyone create an account.",
  accounts_disabled: "This server has no accounts.",
  mail_unavailable: "This server can't send email right now. Try again later.",
  remote_unreachable:
    "The server couldn't be reached. Check its address and your connection.",
  already_linked:
    "This app is already logged in to a server. Log out of it first.",
};

/**
 * Tells a person why signing in to the server at the address failed,
 * or another request to it that `attempt` names as what the server could not do, such as "send a reset link".
 */
export function signInFailureMessage(
  failure: RequestFailure,
  serverUrl: string,
  attempt = "sign you in",
): string {
  if (failure.code === "too_many_attempts")
    return tooManyAttemptsMessage(failure.retryAfterSeconds);
  const known = failure.code && messagesByCode[failure.code];
  if (known) return known;
  if (failure.status === "NETWORK")
    return `Couldn't reach a server at ${serverUrl}. Check the address and your connection.`;
  if (failure.status === 404 || failure.status === "NO_DATA")
    return `The server at ${serverUrl} did not answer as an easyImmerse server does. Check the address.`;
  return `The server could not ${attempt}: ${failure.message}`;
}

function tooManyAttemptsMessage(retryAfterSeconds: number | undefined): string {
  if (retryAfterSeconds === undefined)
    return "Too many attempts. Try again in a few minutes.";
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Try again in ${minutes === 1 ? "a minute" : `${minutes} minutes`}.`;
}
