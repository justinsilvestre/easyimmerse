import type { SyncLink } from "@easyimmerse/types";
import clsx from "clsx";

/** Tells in one line how backing the work up to the linked server fares. */
export function SyncStateLine({
  link,
  serverName,
}: {
  link: SyncLink;
  serverName: string;
}) {
  const isHealthy = link.state.kind === "idle" || link.state.kind === "syncing";
  return (
    <span role="status" className={clsx(!isHealthy && "text-warning-fg")}>
      {syncStateText(link, serverName)}
    </span>
  );
}

function syncStateText(
  { state, last_synced_at_ms }: SyncLink,
  serverName: string,
) {
  switch (state.kind) {
    case "idle":
      return "Up to date";
    case "syncing":
      return last_synced_at_ms === null
        ? `Backing up your work to ${serverName}…`
        : "Synchronizing…";
    case "unreachable":
      return `Couldn't reach ${serverName}`;
    case "logged_out":
      return "Logged out";
    case "failed":
      return `Couldn't back up to ${serverName}`;
  }
}
