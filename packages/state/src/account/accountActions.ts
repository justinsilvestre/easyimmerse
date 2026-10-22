import type {
  AccountRole,
  ServerAuthInfo,
  SessionCreated,
} from "@easyimmerse/types";
import type { RequestFailure } from "../server/serverRequest.ts";
import type { MailedLinkFields } from "./mailedLinkFlow.ts";
import type { MailedLink } from "./readMailedLink.ts";
import type { SignInOutcome } from "./signInAttempt.ts";
import type { SignInFields } from "./signInForm.ts";
import type { NewUserForm } from "./userManagement.ts";

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
  /** The person said they forgot their password, which asks for a reset link where the server can mail one. */
  passwordResetAsked: () => ({ type: "passwordResetAsked" }) as const,
  /** The person sent the form that asks for a password reset link. */
  passwordResetSubmitted: () => ({ type: "passwordResetSubmitted" }) as const,
  /** The server accepted the request for a password reset link, or the request failed. */
  passwordResetAnswered: (outcome: SignInOutcome<null>) =>
    ({ type: "passwordResetAnswered", outcome }) as const,
  /** The person went back from asking for a reset link to logging in. */
  passwordResetLeft: () => ({ type: "passwordResetLeft" }) as const,
  /** The person asked to log out of the account the app is connected through. */
  signOutRequested: () => ({ type: "signOutRequested" }) as const,
  /** The person asked to log the account out on one of its devices, which may be this one. */
  deviceLogOutRequested: (sessionId: string, isCurrent: boolean) =>
    ({ type: "deviceLogOutRequested", sessionId, isCurrent }) as const,
  /** The person asked the server to mail another link that confirms the account's email address. */
  confirmationEmailRequested: () =>
    ({ type: "confirmationEmailRequested" }) as const,
  /** The app was opened with a link a server mailed, whose parameters it has removed from the address. */
  mailedLinkOpened: (link: MailedLink) =>
    ({ type: "mailedLinkOpened", link }) as const,
  /** The person changed fields of the form that follows a mailed link. */
  mailedLinkFormChanged: (changes: Partial<MailedLinkFields>) =>
    ({ type: "mailedLinkFormChanged", changes }) as const,
  /** The person sent the form that follows a mailed link. */
  mailedLinkSubmitted: () => ({ type: "mailedLinkSubmitted" }) as const,
  /** The server confirmed the email address of a mailed link, or following it failed. */
  emailConfirmationAnswered: (outcome: SignInOutcome<null>) =>
    ({ type: "emailConfirmationAnswered", outcome }) as const,
  /** The server at the address set the password chosen through a reset link and opened a session, or that failed. */
  newPasswordAnswered: (
    serverUrl: string,
    outcome: SignInOutcome<SessionCreated>,
  ) => ({ type: "newPasswordAnswered", serverUrl, outcome }) as const,
  /** The administrator changed fields of the form that creates an account. */
  newUserFormChanged: (
    changes: Partial<Pick<NewUserForm, "email" | "password" | "role">>,
  ) => ({ type: "newUserFormChanged", changes }) as const,
  /** The administrator sent the form that creates an account. */
  newUserSubmitted: () => ({ type: "newUserSubmitted" }) as const,
  /** The administrator chose another role for an account. */
  userRoleChosen: (userId: string, role: AccountRole) =>
    ({ type: "userRoleChosen", userId, role }) as const,
  /** The administrator asked to delete an account, which waits for them to confirm it. */
  userDeletionAsked: (userId: string) =>
    ({ type: "userDeletionAsked", userId }) as const,
  /** The administrator kept the account they had asked to delete. */
  userDeletionCancelled: () => ({ type: "userDeletionCancelled" }) as const,
  /** The administrator confirmed the deletion they had asked for. */
  userDeletionConfirmed: () => ({ type: "userDeletionConfirmed" }) as const,
};

/** An action of the account. */
export type AccountAction = ReturnType<
  (typeof accountActions)[keyof typeof accountActions]
>;
