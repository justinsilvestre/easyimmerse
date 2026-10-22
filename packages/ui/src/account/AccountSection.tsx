import {
  type RootState,
  selectMailedLink,
  selectServerConfig,
  selectSyncStatus,
} from "@easyimmerse/state";
import { useId } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { BuiltInServerAccount } from "./BuiltInServerAccount.tsx";
import { ConnectedAccount } from "./ConnectedAccount.tsx";
import { EmailConfirmationByLink } from "./EmailConfirmationByLink.tsx";
import { NewPasswordForm } from "./NewPasswordForm.tsx";
import { SignInForm } from "./SignInForm.tsx";

/**
 * The Account section of Settings, headed "Log in" while the app is logged in to no account: the form that logs in to a server while the app runs offline,
 * the server the native app's built-in server keeps a copy of the work on,
 * and otherwise who the app's server knows it as.
 * A reset link the app was opened with shows the form for a new password instead, and a confirmation link shows what came of it.
 */
export function AccountSection() {
  const headingId = useId();
  const server = useAppSelector(selectServerConfig);
  const link = useAppSelector(selectMailedLink);
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        {isLoggedIn ? "Account" : "Log in"}
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
  "Log in to an easyImmerse server to save your projects, media and flashcards there and use them on your other devices.";

/**
 * Tells whether the app is logged in to an account: connected to a server other than its own built-in one,
 * or with a built-in server that is linked to a remote, or not yet known to be unlinked.
 */
function selectIsLoggedIn(state: RootState): boolean {
  const server = selectServerConfig(state);
  if (server === null) return false;
  if (server.bundledIn === undefined) return true;
  return selectSyncStatus(state)?.link !== null;
}
