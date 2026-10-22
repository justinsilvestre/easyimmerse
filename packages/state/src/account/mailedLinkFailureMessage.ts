import type { RequestFailure } from "../server/serverRequest.ts";
import type { MailedLink } from "./readMailedLink.ts";
import { signInFailureMessage } from "./signInFailureMessage.ts";

const attempts = {
  confirmEmail: "confirm your email address",
  resetPassword: "set your new password",
} satisfies Record<MailedLink["kind"], string>;

/**
 * Tells a person why following a mailed link on the server at the address failed.
 * An expired or used confirmation link points to a new one, which the Account section offers once the app is connected.
 */
export function mailedLinkFailureMessage(
  kind: MailedLink["kind"],
  failure: RequestFailure,
  serverUrl: string,
  isConnected: boolean,
): string {
  if (failure.code === "invalid_link")
    return invalidLinkMessage(kind, isConnected);
  return signInFailureMessage(failure, serverUrl, attempts[kind]);
}

function invalidLinkMessage(
  kind: MailedLink["kind"],
  isConnected: boolean,
): string {
  if (kind === "resetPassword")
    return "This link is no longer valid. Ask for a new one from the login form.";
  return isConnected
    ? "This confirmation link is no longer valid."
    : "This confirmation link is no longer valid. You can ask for a new one after logging in.";
}
