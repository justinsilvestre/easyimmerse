import { useGetCurrentPrincipalQuery } from "@easyimmerse/backend";
import {
  actions,
  hostOf,
  type NativePlatform,
  selectIsUnlinking,
} from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import { Button } from "../components/Button.tsx";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { accountRoleName } from "./accountRoleName.ts";
import { cloudStorageSectionId } from "./CloudStorageSection.tsx";
import { DeviceList } from "./DeviceList.tsx";
import { deviceNames } from "./deviceNames.ts";
import { EmailConfirmation } from "./EmailConfirmation.tsx";
import { formatCopyTime } from "./formatCopyTime.ts";
import { SyncConflictsNotice } from "./SyncConflictsNotice.tsx";
import { SyncLinkProblem } from "./SyncLinkProblem.tsx";
import { SyncStateLine } from "./SyncStateLine.tsx";
import { UserManagement } from "./users/UserManagement.tsx";

/**
 * The account on the server that the built-in server keeps a copy of the work on: who it is, how copying fares,
 * a link to the media files it keeps, and, while that server answers for it, its devices, its email confirmation and, for an administrator, the server's accounts.
 */
export function RemoteAccountDetails({
  link,
  platform,
}: {
  link: SyncLink;
  platform: NativePlatform;
}) {
  const answersForAccount =
    link.state.kind !== "unreachable" && link.state.kind !== "logged_out";
  return (
    <>
      <dl className="grid max-w-lg grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-fg-muted">Email</dt>
        <dd className="break-all">
          {link.account_email}
          {answersForAccount && <RemoteEmailConfirmation />}
        </dd>
        <dt className="text-fg-muted">Role</dt>
        <dd>{accountRoleName(link.account_role)}</dd>
        <dt className="text-fg-muted">Server</dt>
        <dd className="break-all">{link.server_url}</dd>
        <dt className="text-fg-muted">Status</dt>
        <dd>
          <SyncStateLine link={link} />
        </dd>
        {link.last_synced_at_ms !== null && (
          <>
            <dt className="text-fg-muted">Last copied</dt>
            <dd>{formatCopyTime(link.last_synced_at_ms)}</dd>
          </>
        )}
      </dl>
      <SyncLinkProblem link={link} platform={platform} />
      {link.conflict_count > 0 && (
        <SyncConflictsNotice
          conflicts={link.conflicts}
          count={link.conflict_count}
        />
      )}
      {answersForAccount && (
        <a
          href={`#${cloudStorageSectionId}`}
          className="self-start text-sm text-accent-fg underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
        >
          Storage on {hostOf(link.server_url)}
        </a>
      )}
      {link.state.kind !== "logged_out" && (
        <LogOut host={hostOf(link.server_url)} platform={platform} />
      )}
      {answersForAccount && <DeviceList />}
      {answersForAccount && link.account_role === "administrator" && (
        <UserManagement />
      )}
    </>
  );
}

/** Whether the account's email address is confirmed, as the linked server tells. */
function RemoteEmailConfirmation() {
  const principal = useGetCurrentPrincipalQuery("linkedRemote");
  if (principal.data?.kind !== "account") return null;
  return <EmailConfirmation user={principal.data.user} />;
}

function LogOut({
  host,
  platform,
}: {
  host: string;
  platform: NativePlatform;
}) {
  const dispatch = useAppDispatch();
  const isUnlinking = useAppSelector(selectIsUnlinking);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        aria-disabled={isUnlinking}
        onClick={() => {
          if (!isUnlinking) dispatch(actions.signOutRequested());
        }}
      >
        {isUnlinking ? "Logging out…" : `Log out of ${host}`}
      </Button>
      <p className="text-xs text-fg-muted">
        Your work stays on {deviceNames[platform]}.
      </p>
    </div>
  );
}
