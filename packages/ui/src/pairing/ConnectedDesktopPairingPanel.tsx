import { useIssuePairingCodeQuery } from "@easyimmerse/backend";
import type { DesktopPairingServer } from "@easyimmerse/state";
import {
  type DesktopPairingCode,
  DesktopPairingPanel,
} from "./DesktopPairingPanel.tsx";

/** How often a new pairing code is asked for: as often as the server's codes expire, ten minutes after they are issued. */
const pairingCodeLifetimeMs = 10 * 60 * 1000;

/**
 * The desktop pairing panel with its pairing code from the server, which it asks for again as each code expires.
 * The server's state comes from the caller; null means it is not known yet.
 */
export function ConnectedDesktopPairingPanel({
  server,
  onStartServer,
}: {
  server: DesktopPairingServer | null;
  onStartServer: () => void;
}) {
  const needsCode = server?.kind === "running" && !server.hasAccounts;
  const issued = useIssuePairingCodeQuery(undefined, {
    skip: !needsCode,
    refetchOnMountOrArgChange: true,
    pollingInterval: pairingCodeLifetimeMs,
  });
  if (server === null)
    return <p className="text-sm text-fg-muted">Checking the server…</p>;
  const code: DesktopPairingCode = issued.isError
    ? { kind: "failed" }
    : issued.data
      ? { kind: "issued", code: issued.data }
      : { kind: "loading" };
  return (
    <DesktopPairingPanel
      server={server}
      code={code}
      onStartServer={onStartServer}
      onNewCode={() => void issued.refetch()}
    />
  );
}
