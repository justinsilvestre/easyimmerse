import {
  useGetCurrentPrincipalQuery,
  useGetServerAuthInfoQuery,
} from "@easyimmerse/backend";
import { actions, selectIsSigningOut } from "@easyimmerse/state";
import type { AccountUser } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { accountRoleName } from "./accountRoleName.ts";
import { UserManagement } from "./users/UserManagement.tsx";

/** Tells who the app's server knows it as: an account, which may log out, or the server's owner, who needs none. */
export function ConnectedAccount({ serverUrl }: { serverUrl: string }) {
  const principal = useGetCurrentPrincipalQuery();
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
  const authInfo = useGetServerAuthInfoQuery();
  return (
    <>
      <p className="text-sm text-fg-muted">
        This app uses its own easyImmerse server, which needs no account.
        Logging in to an account is not available here yet.
      </p>
      {authInfo.data?.accounts === true && <UserManagement />}
    </>
  );
}

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
        <dd className="break-all">{user.email}</dd>
        <dt className="text-fg-muted">Role</dt>
        <dd>{accountRoleName(user.role)}</dd>
        <dt className="text-fg-muted">Server</dt>
        <dd className="break-all">{serverUrl}</dd>
      </dl>
      <LogOut />
      {user.role === "administrator" && <UserManagement />}
    </>
  );
}

function PrincipalFailure({ error }: { error: unknown }) {
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

function principalFailureMessage(error: unknown): string {
  const { status, message } = (error ?? {}) as {
    status?: unknown;
    message?: unknown;
  };
  if (status === 401)
    return "The server no longer accepts this app's sign-in. Log out, then log in again.";
  const detail = typeof message === "string" && message ? `: ${message}` : ".";
  return `Couldn't tell which account this app uses${detail}`;
}
