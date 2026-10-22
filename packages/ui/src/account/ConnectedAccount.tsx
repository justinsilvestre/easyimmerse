import {
  useGetCurrentPrincipalQuery,
  useGetServerAuthInfoQuery,
} from "@easyimmerse/backend";
import {
  actions,
  isOwnTokenRefused,
  selectIsSigningOut,
} from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { accountRoleName } from "./accountRoleName.ts";
import { DeviceList } from "./DeviceList.tsx";
import { EmailConfirmation } from "./EmailConfirmation.tsx";
import { UserManagement } from "./users/UserManagement.tsx";

/** Tells who the app's server knows it as: an account, which may log out, or the server's owner, who needs none. */
export function ConnectedAccount({ serverUrl }: { serverUrl: string }) {
  const principal = useGetCurrentPrincipalQuery("self");
  if (principal.isError) return <PrincipalFailure error={principal.error} />;
  if (principal.data === undefined)
    return (
      <p className="text-sm text-fg-muted">
        Checking which account this app uses…
      </p>
    );
  if (principal.data.kind === "launch") return <LaunchAccount />;
  return <AccountDetails user={principal.data.user} serverUrl={serverUrl} />;
}

/** The server's owner, who needs no account, and who manages the server's accounts when it has any. */
function LaunchAccount() {
  const authInfo = useGetServerAuthInfoQuery("self");
  return (
    <>
      <p className="text-sm text-fg-muted">{launchText}</p>
      {authInfo.data?.accounts === true && <UserManagement />}
    </>
  );
}

/** Tells the owner of a server reached over the network, such as one a build was set up with, why they need no account. */
const launchText =
  "This app is set up to use its own easyImmerse server, so you don't need an account. You can't log in to an account from this app yet.";

function AccountDetails({
  user,
  serverUrl,
}: {
  user: AccountUser;
  serverUrl: string;
}) {
  return (
    <>
      <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-fg-muted">Email</dt>
        <dd className="break-all">
          {user.email}
          <EmailConfirmation user={user} />
        </dd>
        <dt className="text-fg-muted">Role</dt>
        <dd>{accountRoleName(user.role)}</dd>
        <dt className="text-fg-muted">Server</dt>
        <dd className="break-all">{serverUrl}</dd>
      </dl>
      <LogOut />
      <DeviceList />
      {user.role === "administrator" && <UserManagement />}
    </>
  );
}

/** Why the query of the current principal failed: the backend's failure, or one RTK Query describes. */
type PrincipalError = ReturnType<typeof useGetCurrentPrincipalQuery>["error"];

function PrincipalFailure({ error }: { error: PrincipalError }) {
  return (
    <>
      <p role="alert" className="text-sm text-danger-fg">
        {principalFailureMessage(error)}
      </p>
      <LogOut />
    </>
  );
}

function LogOut() {
  const dispatch = useAppDispatch();
  const isSigningOut = useAppSelector(selectIsSigningOut);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        aria-disabled={isSigningOut}
        onClick={() => dispatch(actions.signOutRequested())}
      >
        {isSigningOut ? "Logging out…" : "Log out"}
      </Button>
      <p className="text-xs text-fg-muted">
        Logging out disconnects this app from the server.
      </p>
    </div>
  );
}

function principalFailureMessage(error: PrincipalError): string {
  if (error !== undefined && "status" in error && isOwnTokenRefused(error))
    return "The server no longer accepts this app's sign-in. Log out, then log in again.";
  const detail = error?.message ? `: ${error.message}` : ".";
  return `Couldn't tell which account this app uses${detail}`;
}
