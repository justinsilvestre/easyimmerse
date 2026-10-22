import type { DesktopPairingServer } from "@easyimmerse/state";
import { useDesktopPairingCode } from "../hooks/useDesktopPairingCode.ts";
import { DesktopPairingPanel } from "./DesktopPairingPanel.tsx";

/**
 * The desktop pairing panel with its pairing code from the server, which it renews shortly before each code expires.
 * The server's state comes from the caller; null means it is not known yet.
 */
export function ConnectedDesktopPairingPanel({
  server,
  onStartServer,
}: {
  server: DesktopPairingServer | null;
  onStartServer: () => void;
}) {
  const pairingCode = useDesktopPairingCode(
    server?.kind === "running" && !server.hasAccounts,
  );
  if (server === null)
    return (
      <p role="status" className="text-sm text-fg-muted">
        Checking the server…
      </p>
    );
  return (
    <DesktopPairingPanel
      server={server}
      code={pairingCode.code}
      onStartServer={onStartServer}
      onNewCode={pairingCode.renew}
    />
  );
}
