import { selectMailedLink, selectServerConfig } from "@easyimmerse/state";
import { useId } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { BuiltInServerAccount } from "./BuiltInServerAccount.tsx";
import { ConnectedAccount } from "./ConnectedAccount.tsx";
import { EmailConfirmationByLink } from "./EmailConfirmationByLink.tsx";
import { NewPasswordForm } from "./NewPasswordForm.tsx";
import { SignInForm } from "./SignInForm.tsx";

/**
 * The Account section of Settings: the form that logs in to a server while the app runs offline,
 * the server the native app's built-in server keeps a copy of the work on,
 * and otherwise who the app's server knows it as.
 * A reset link the app was opened with shows the form for a new password instead, and a confirmation link shows what came of it.
 */
export function AccountSection() {
  const headingId = useId();
  const server = useAppSelector(selectServerConfig);
  const link = useAppSelector(selectMailedLink);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Account
      </h2>
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
  "You're not logged in to a server. Log in to an easyImmerse server to save your projects, media and flashcards there and use them on your other devices.";
