import {
  useGetCurrentPrincipalQuery,
  useGetServerAuthInfoQuery,
} from "@easyimmerse/backend";
import {
  actions,
  isOwnTokenRefused,
  selectIsCloudServer,
  selectIsSigningOut,
  selectLogOutDroppedCount,
  selectServerName,
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
  if (principal.isError)
    return <PrincipalFailure error={principal.error} serverUrl={serverUrl} />;
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
  const isCloud = useAppSelector((state) =>
    selectIsCloudServer(state, serverUrl),
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-fg-muted">Email</dt>
          <dd className="break-all">
            {user.email}
            <EmailConfirmation user={user} />
          </dd>
          <dt className="text-fg-muted">Role</dt>
          <dd>{accountRoleName(user.role)}</dd>
          {!isCloud && (
            <>
              <dt className="text-fg-muted">Server</dt>
              <dd className="break-all">{serverUrl}</dd>
            </>
          )}
        </dl>
        <LogOut serverUrl={serverUrl} />
      </div>
      <DeviceList />
      {user.role === "administrator" && <UserManagement />}
    </div>
  );
}

/** Why the query of the current principal failed: the backend's failure, or one RTK Query describes. */
type PrincipalError = ReturnType<typeof useGetCurrentPrincipalQuery>["error"];

function PrincipalFailure({
  error,
  serverUrl,
}: {
  error: PrincipalError;
  serverUrl: string;
}) {
  const serverName = useAppSelector((state) =>
    selectServerName(state, serverUrl),
  );
  if (isLoggedOutByServer(error))
    return (
      <>
        <p role="alert" className="text-sm text-danger-fg">
          {`You were logged out of ${serverName}. Log in again to keep using your account here.`}
        </p>
        <LogInAgain serverName={serverName} />
      </>
    );
  return (
    <>
      <p role="alert" className="text-sm text-danger-fg">
        {principalFailureMessage(error)}
      </p>
      <LogOut serverUrl={serverUrl} />
    </>
  );
}

/** Tells whether the server refused the app's session, as it does once the session has ended elsewhere or expired. */
function isLoggedOutByServer(error: PrincipalError): boolean {
  return error !== undefined && "status" in error && isOwnTokenRefused(error);
}

/** Forgets the session the server refused, which leaves the form to log in again, once any unsaved flashcards may be dropped. */
function LogInAgain({ serverName }: { serverName: string }) {
  const dispatch = useAppDispatch();
  const isSigningOut = useAppSelector(selectIsSigningOut);
  const droppedCount = useAppSelector(selectLogOutDroppedCount);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="primary"
        aria-disabled={isSigningOut || droppedCount !== null}
        onClick={() => {
          if (!isSigningOut) dispatch(actions.signOutRequested());
        }}
      >
        Log in again
      </Button>
      {droppedCount !== null && (
        <LogOutConfirmation droppedCount={droppedCount} host={serverName} />
      )}
    </div>
  );
}

function LogOut({ serverUrl }: { serverUrl: string }) {
  const dispatch = useAppDispatch();
  const isSigningOut = useAppSelector(selectIsSigningOut);
  const droppedCount = useAppSelector(selectLogOutDroppedCount);
  const host = useAppSelector((state) => selectServerName(state, serverUrl));
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        aria-disabled={isSigningOut || droppedCount !== null}
        onClick={() => {
          if (!isSigningOut) dispatch(actions.signOutRequested());
        }}
      >
        {isSigningOut ? "Logging out…" : "Log out"}
      </Button>
      {droppedCount === null ? (
        <p className="text-xs text-fg-muted">
          {`After you log out, your projects, media, and flashcards stay saved on ${host}. Log in again to open them here.`}
        </p>
      ) : (
        <LogOutConfirmation droppedCount={droppedCount} host={host} />
      )}
    </div>
  );
}

/** Asks the person to confirm logging out, which drops the flashcards not yet saved to the server. */
function LogOutConfirmation({
  droppedCount,
  host,
}: {
  droppedCount: number;
  host: string;
}) {
  const dispatch = useAppDispatch();
  const cards =
    droppedCount === 1
      ? "1 flashcard hasn't"
      : `${droppedCount} flashcards haven't`;
  return (
    <fieldset
      aria-label="Log out anyway?"
      className="mt-2 flex max-w-lg flex-wrap items-center gap-2 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
    >
      <p className="flex-1">
        {`${cards} been saved to ${host} yet. Logging out removes ${droppedCount === 1 ? "it" : "them"} from this browser.`}
      </p>
      <Button
        size="sm"
        variant="danger"
        onClick={() => dispatch(actions.logOutConfirmed())}
      >
        Log out anyway
      </Button>
      <Button size="sm" onClick={() => dispatch(actions.logOutCancelled())}>
        Stay logged in
      </Button>
    </fieldset>
  );
}

function principalFailureMessage(error: PrincipalError): string {
  const detail = error?.message ? `: ${error.message}` : ".";
  return `Couldn't tell which account this app uses${detail}`;
}
