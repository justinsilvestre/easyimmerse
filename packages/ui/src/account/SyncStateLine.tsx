import { hostOf } from "@easyimmerse/state";
import type { SyncLink } from "@easyimmerse/types";
import clsx from "clsx";

/** Tells in one line how backing the work up to the linked server fares. */
export function SyncStateLine({ link }: { link: SyncLink }) {
  const isHealthy = link.state.kind === "idle" || link.state.kind === "syncing";
  return (
    <span role="status" className={clsx(!isHealthy && "text-warning-fg")}>
      {syncStateText(link)}
    </span>
  );
}

function syncStateText({ state, server_url, last_synced_at_ms }: SyncLink) {
  switch (state.kind) {
    case "idle":
      return "Up to date";
    case "syncing":
      return last_synced_at_ms === null
        ? `Backing up your work to ${hostOf(server_url)}…`
        : "Synchronizing…";
    case "unreachable":
      return `Couldn't reach ${hostOf(server_url)}`;
    case "logged_out":
      return "Logged out";
    case "failed":
      return `Couldn't back up to ${hostOf(server_url)}`;
  }
}
