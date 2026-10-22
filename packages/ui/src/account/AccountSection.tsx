import { selectMailedLink, selectServerConfig } from "@easyimmerse/state";
import { useId } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ConnectedAccount } from "./ConnectedAccount.tsx";
import { EmailConfirmationByLink } from "./EmailConfirmationByLink.tsx";
import { NewPasswordForm } from "./NewPasswordForm.tsx";
import { SignInForm } from "./SignInForm.tsx";

/**
 * The Account section of Settings: the form that logs in to a server while the app runs offline,
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
            <SignInForm />
          ) : (
            <ConnectedAccount serverUrl={server.serverUrl} />
          )}
        </>
      )}
    </section>
  );
}
