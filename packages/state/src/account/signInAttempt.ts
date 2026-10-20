import type { RequestFailure } from "../server/serverRequest.ts";
import type { SignInMode } from "./signInForm.ts";

/** An email address and password sent to a server to log in or to sign up. */
export type SignInAttempt = {
  serverUrl: string;
  mode: SignInMode;
  email: string;
  password: string;
};

/** How a request made while signing in ended: the server's answer, or why there is none. */
export type SignInOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: RequestFailure };
