import {
  type RootState,
  selectMailedLink,
  selectServerConfig,
  selectSignInForm,
} from "@easyimmerse/state";
import { useId } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { BuiltInServerAccount } from "./BuiltInServerAccount.tsx";
import { ConnectedAccount } from "./ConnectedAccount.tsx";
import { EmailConfirmationByLink } from "./EmailConfirmationByLink.tsx";
import { NewPasswordForm } from "./NewPasswordForm.tsx";
import { SignInForm } from "./SignInForm.tsx";
import { selectLoginState } from "./selectLoginState.ts";

/**
 * The content of the account settings screen, headed "Log in" or "Sign up" while it shows the form for doing so, and "Account" otherwise:
 * the form that logs in to a server while the app runs offline,
 * the server the native app's built-in server keeps a copy of the work on,
 * and otherwise who the app's server knows it as.
 * A reset link the app was opened with shows the form for a new password instead, and a confirmation link shows what came of it.
 */
export function AccountSection() {
  const headingId = useId();
  const server = useAppSelector(selectServerConfig);
  const link = useAppSelector(selectMailedLink);
  const heading = useAppSelector(selectAccountHeading);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h1 id={headingId} className="text-xl font-semibold">
        {heading}
      </h1>
      {link?.kind === "resetPassword" ? (
        <NewPasswordForm />
      ) : (
        <>
          {link !== null && <EmailConfirmationByLink link={link} />}
          {server === null ? (
            <SignInForm intro={offlineIntro} />
          ) : server.bundledIn === undefined ? (
            <ConnectedAccount serverUrl={server.serverUrl} />
          ) : (
            <BuiltInServerAccount />
          )}
        </>
      )}
    </section>
  );
}

const offlineIntro =
  "With an account on an easyImmerse server, you can save your projects, media and flashcards there and use them on your other devices.";

/** Returns what the page is headed: what its sign-in form is set to do while the form shows, and "Account" otherwise. */
function selectAccountHeading(state: RootState): string {
  const form = selectSignInForm(state);
  const isFormShowing =
    selectMailedLink(state)?.kind !== "resetPassword" &&
    selectLoginState(state) === "loggedOut" &&
    form.passwordReset === null;
  if (!isFormShowing) return "Account";
  return form.mode === "login" ? "Log in" : "Sign up";
}
