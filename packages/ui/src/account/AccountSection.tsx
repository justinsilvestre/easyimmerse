import { selectServerConfig } from "@easyimmerse/state";
import { useId } from "react";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { ConnectedAccount } from "./ConnectedAccount.tsx";
import { SignInForm } from "./SignInForm.tsx";

/**
 * The Account section of Settings: the form that logs in to a server while the app runs offline,
 * and otherwise who the app's server knows it as.
 */
export function AccountSection() {
  const headingId = useId();
  const server = useAppSelector(selectServerConfig);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-base font-semibold">
        Account
      </h2>
      {server === null ? (
        <SignInForm />
      ) : (
        <ConnectedAccount serverUrl={server.serverUrl} />
      )}
    </section>
  );
}
