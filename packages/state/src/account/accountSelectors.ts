import { createSelector } from "reselect";
import type { AppRoot } from "../app/createAppStore.ts";
import { selectIsRequestInFlight } from "../operations/operationsSelectors.ts";
import { assessPasswordStrength } from "./passwordStrength.ts";
import { signInFailureMessage } from "./signInFailureMessage.ts";
import {
  canAskPasswordReset,
  canSubmitPasswordReset,
  canSubmitSignIn,
  isBusy,
  type PasswordResetStatus,
  type ServerOffer,
  type SignInForm,
  type SignInMode,
  type SignInServerChoice,
  type SignInStatus,
  serverOfferOf,
  signInServerUrlOf,
} from "./signInForm.ts";
import { logOutRequestId } from "./updateSignIn.ts";

/** The sign-in form as it shows. */
export type SignInFormView = {
  mode: SignInMode;
  ownServerUrl: string;
  email: string;
  password: string;
  status: SignInStatus["kind"];
  /** Whether the form waits for a server's answer, during which it takes no changes. */
  isBusy: boolean;
  /** Why the last attempt failed, while it stands. */
  failureMessage: string | null;
  /** What the chosen server offers, as far as the form has learned. */
  serverOffer: ServerOffer;
  /** How far the request for a password reset link has gone, while the form asks for one instead of logging in. */
  passwordReset: PasswordResetStatus["kind"] | null;
  /** Whether the person can ask for a password reset link now. */
  canAskPasswordReset: boolean;
  /** Whether the request for a password reset link can be sent now. */
  canSubmitPasswordReset: boolean;
};

/** Which servers a person may sign in to, and which one the form names. */
export type AccountServerOptions = {
  hasOfficialServer: boolean;
  serverChoice: SignInServerChoice;
};

const selectForm = (state: AppRoot) => state.app.account.signInForm;

const selectCloudUrl = (state: AppRoot) => state.app.server.cloudUrl;

/** Returns the sign-in form as it shows, which keeps its reference until the form or the servers change. */
export const selectSignInForm = createSelector(
  [selectForm, selectCloudUrl],
  (form, cloudUrl): SignInFormView => {
    const serverUrl = signInServerUrlOf(form, cloudUrl);
    return {
      mode: form.mode,
      ownServerUrl: form.ownServerUrl,
      email: form.email,
      password: form.password,
      status: form.status.kind,
      isBusy: isBusy(form),
      failureMessage: failureMessageOf(form, serverUrl),
      serverOffer: serverOfferOf(form, serverUrl),
      passwordReset: form.passwordReset?.kind ?? null,
      canAskPasswordReset: canAskPasswordReset(form, cloudUrl),
      canSubmitPasswordReset: canSubmitPasswordReset(form, cloudUrl),
    };
  },
);

/** Returns how strong the password being chosen is, once one is typed while signing up, and otherwise null. */
export const selectPasswordStrength = createSelector(
  [
    (state: AppRoot) => selectForm(state).mode,
    (state: AppRoot) => selectForm(state).password,
  ],
  (mode, password) =>
    mode === "signup" && password !== ""
      ? assessPasswordStrength(password)
      : null,
);

/** Returns whether the app knows of an official server, and which server the form names: the person's own whenever there is no official one. */
export const selectAccountServerOptions = createSelector(
  [selectCloudUrl, (state: AppRoot) => selectForm(state).serverChoice],
  (cloudUrl, serverChoice): AccountServerOptions => ({
    hasOfficialServer: cloudUrl !== null,
    serverChoice: cloudUrl === null ? "own" : serverChoice,
  }),
);

/** Tells whether the sign-in form can be sent now. */
export const selectCanSubmitSignIn = (state: AppRoot) =>
  canSubmitSignIn(selectForm(state), selectCloudUrl(state));

/** Tells whether the app is logging out of its account. */
export const selectIsSigningOut = (state: AppRoot) =>
  selectIsRequestInFlight(state.app, logOutRequestId);

function failureMessageOf(
  form: SignInForm,
  serverUrl: string | null,
): string | null {
  const address = serverUrl ?? "that address";
  if (form.passwordReset?.kind === "failed")
    return signInFailureMessage(
      form.passwordReset.failure,
      address,
      "send a reset link",
    );
  if (form.status.kind !== "failed") return null;
  return signInFailureMessage(form.status.failure, address);
}
