import type { RequestFailure } from "../server/serverRequest.ts";
import type { SignInMode } from "./signInForm.ts";

/** An email address and password sent to a server to log in or to sign up. */
export type SignInAttempt = {
  serverUrl: string;
  mode: SignInMode;
  email: string;
  password: string;
};

/** The code of the failure to keep the server and session in the browser, which the platform reports when connecting. */
export const connectionNotKeptCode = "connection_not_kept";

/** How a request made while signing in ended: the server's answer, or why there is none. */
export type SignInOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: RequestFailure };
