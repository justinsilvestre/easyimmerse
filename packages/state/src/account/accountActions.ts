import type { ServerAuthInfo, SessionCreated } from "@easyimmerse/types";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { SignInFields } from "./signInForm.ts";

/** The action creators of the account. */
export const accountActions = {
  /** The person changed fields of the sign-in form. */
  signInFormChanged: (changes: Partial<SignInFields>) =>
    ({ type: "signInFormChanged", changes }) as const,
  /** The person sent the sign-in form. */
  signInSubmitted: () => ({ type: "signInSubmitted" }) as const,
  /** The server at the address said what it offers for signing in. */
  serverAuthInfoReceived: (serverUrl: string, info: ServerAuthInfo) =>
    ({ type: "serverAuthInfoReceived", serverUrl, info }) as const,
  /** The server at the address logged the person in, or signed them up, and gave the app a session. */
  signInSucceeded: (serverUrl: string, session: SessionCreated) =>
    ({ type: "signInSucceeded", serverUrl, session }) as const,
  /** Asking the server, or signing in to it, failed. */
  signInFailed: (failure: RequestFailure) =>
    ({ type: "signInFailed", failure }) as const,
  /** The person asked to log out of the account the app is connected through. */
  signOutRequested: () => ({ type: "signOutRequested" }) as const,
};

/** An action of the account. */
export type AccountAction = ReturnType<
  (typeof accountActions)[keyof typeof accountActions]
>;
