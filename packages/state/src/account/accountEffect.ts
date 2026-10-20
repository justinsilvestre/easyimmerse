import type { ServerConfig } from "../server/serverState.ts";
import type { SignInAttempt } from "./signInAttempt.ts";

/**
 * The side effects of the account: asking a server what it offers for signing in, signing in to it,
 * and connecting the app to a server or back to none, which starts the app anew.
 */
export type AccountEffect =
  | { type: "fetchServerAuthInfo"; serverUrl: string }
  | { type: "createSession"; attempt: SignInAttempt }
  | { type: "connectToServer"; server: ServerConfig }
  | { type: "disconnectFromServer" };
