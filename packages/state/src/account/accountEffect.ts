import type { ServerConfig } from "../server/serverState.ts";
import type { SignInAttempt } from "./signInAttempt.ts";

/**
 * The side effects of the account: asking a server what it offers for signing in, signing in to it,
 * connecting the app to a server or back to none, which starts the app anew,
 * asking a server to mail a password reset link, and following the links it mails.
 */
export type AccountEffect =
  | { type: "fetchServerAuthInfo"; serverUrl: string }
  | { type: "createSession"; attempt: SignInAttempt }
  | { type: "connectToServer"; server: ServerConfig }
  | { type: "disconnectFromServer" }
  | { type: "requestPasswordReset"; serverUrl: string; email: string }
  | { type: "confirmEmail"; serverUrl: string; token: string }
  | {
      type: "setNewPassword";
      serverUrl: string;
      token: string;
      password: string;
    };
