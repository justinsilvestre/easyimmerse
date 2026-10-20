import type { RequestFailure } from "../server/serverRequest.ts";

const messagesByCode: Record<string, string> = {
  invalid_credentials: "The email address or the password is wrong.",
  email_taken:
    "An account with this email address already exists. Log in instead.",
  password_too_short: "The password must be at least 8 characters long.",
  invalid_email: "This email address is not valid.",
  signup_closed: "This server does not let anyone sign up.",
  accounts_disabled: "This server has no accounts.",
};

/** Tells a person why signing in to the server at the address failed. */
export function signInFailureMessage(
  failure: RequestFailure,
  serverUrl: string,
): string {
  const known = failure.code && messagesByCode[failure.code];
  if (known) return known;
  if (failure.status === "NETWORK")
    return `Couldn't reach a server at ${serverUrl}. Check the address and your connection.`;
  if (failure.status === 404 || failure.status === "NO_DATA")
    return `The server at ${serverUrl} did not answer as an easyImmerse server does. Check the address.`;
  return `The server could not sign you in: ${failure.message}`;
}
