import {
  useGetCurrentPrincipalQuery,
  useGetStorageStatusQuery,
  useGetSyncStatusQuery,
} from "@easyimmerse/backend";
import {
  type AccountVia,
  selectCloudUrl,
  selectServerConfig,
  serverNameOf,
} from "@easyimmerse/state";
import type { StorageStatus } from "@easyimmerse/types";
import { formatByteSize } from "../components/formatByteSize.ts";
import { useAppSelector } from "../hooks/useAppSelector.ts";
import { StoredCopyRow } from "./StoredCopyRow.tsx";

/** The id of the storage section within the Settings screen, which a link can jump to. */
export const cloudStorageSectionId = "settings-storage";

/** A share of the quota from which the bar warns that little room is left. */
const nearQuotaShare = 0.9;

/**
 * The copies of media files a server keeps for the person, with how much of their quota the copies take, and a way to delete each.
 * It shows for an account on the server the app is connected to, and for the account the native app's built-in server is linked to;
 * otherwise no server keeps copies for the person, and it shows nothing.
 */
export function CloudStorageSection() {
  const storage = useStorageServer();
  if (storage === null) return null;
  return <StorageOn {...storage} />;
}

/** The server that keeps the person's copies, and the way requests reach it, or null when none does. */
function useStorageServer(): { via: AccountVia; host: string } | null {
  const server = useAppSelector(selectServerConfig);
  const cloudUrl = useAppSelector(selectCloudUrl);
  const isBuiltIn = server?.bundledIn !== undefined;
  const principal = useGetCurrentPrincipalQuery("self", {
    skip: server === null || isBuiltIn,
  });
  const link = useGetSyncStatusQuery(undefined, { skip: !isBuiltIn }).data
    ?.link;
  if (server === null) return null;
  if (isBuiltIn)
    return link
      ? { via: "linkedRemote", host: serverNameOf(link.server_url, cloudUrl) }
      : null;
  return principal.data?.kind === "account"
    ? { via: "self", host: serverNameOf(server.serverUrl, cloudUrl) }
    : null;
}

function StorageOn({ via, host }: { via: AccountVia; host: string }) {
  const status = useGetStorageStatusQuery(via);
  return (
    <section
      id={cloudStorageSectionId}
      aria-labelledby={`${cloudStorageSectionId}-heading`}
      className="flex flex-col gap-3"
    >
      <h3
        id={`${cloudStorageSectionId}-heading`}
        className="text-base font-semibold"
      >
        Storage on {host}
      </h3>
      {status.data ? (
        <StorageDetails status={status.data} host={host} />
      ) : (
        status.isError && (
          <p role="alert" className="text-sm text-danger-fg">
            The storage on {host} couldn't be checked.
          </p>
        )
      )}
    </section>
  );
}

function StorageDetails({
  status,
  host,
}: {
  status: StorageStatus;
  host: string;
}) {
  if (status.quota_bytes === 0 && status.copies.length === 0)
    return (
      <p className="text-sm text-fg-muted">
        {host} doesn't keep copies of media files.
      </p>
    );
  return (
    <>
      <QuotaUsage used={status.used_bytes} quota={status.quota_bytes} />
      {status.copies.length === 0 ? (
        <p className="text-sm text-fg-muted">
          No media files are kept on {host}.
        </p>
      ) : (
        <ul
          aria-label={`Media files kept on ${host}`}
          className="flex flex-col divide-y divide-line"
        >
          {status.copies.map((copy) => (
            <StoredCopyRow key={copy.media_file_id} copy={copy} host={host} />
          ))}
        </ul>
      )}
    </>
  );
}

function QuotaUsage({ used, quota }: { used: number; quota: number | null }) {
  if (quota === null)
    return <p className="text-sm">{formatByteSize(used)} used</p>;
  const share = quota === 0 ? 1 : Math.min(1, used / quota);
  return (
    <div className="flex max-w-lg flex-col gap-1.5">
      <p className="text-sm">
        {formatByteSize(used)} of {formatByteSize(quota)} used
      </p>
      <div
        aria-hidden
        className="h-2 overflow-hidden rounded-full bg-surface-strong"
      >
        <div
          className={
            share >= nearQuotaShare ? "h-full bg-danger-fg" : "h-full bg-accent"
          }
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  );
}
