import type { DesktopPairingServer } from "@easyimmerse/state";
import { Button } from "../components/Button.tsx";
import { LaunchTokenPairing } from "./LaunchTokenPairing.tsx";
import { PairingAddress } from "./PairingAddress.tsx";
import type { DesktopPairingCode } from "./PairingCodeLine.tsx";

/**
 * Shows what another device needs to pair with the desktop app on the local network, given the server's state as props.
 * While the server runs on the local network, the panel shows the QR code and the address.
 * With the launch token only, it also shows the pairing code, the time the code stops being valid,
 * and a warning that anyone on the network can use the server.
 */
export function DesktopPairingPanel({
  server,
  code,
  onStartServer,
  onNewCode,
}: {
  server: DesktopPairingServer;
  code: DesktopPairingCode;
  onStartServer: () => void;
  onNewCode: () => void;
}) {
  switch (server.kind) {
    case "unavailable":
      return (
        <p role="alert" className="text-sm text-danger-fg">
          The server's state could not be read: {server.message}
        </p>
      );
    case "stopped":
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-fg-muted">
            The server is not running, so other devices cannot reach this
            computer. Start it to pair a phone or another computer on your local
            network.
          </p>
          <Button variant="primary" onClick={onStartServer}>
            Start the server
          </Button>
        </div>
      );
    case "starting":
      return (
        <p role="status" className="text-sm text-fg-muted">
          The server is starting…
        </p>
      );
    case "loopbackOnly":
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-fg-muted">
            The server is running, but only this computer can reach it. Start it
            on your local network to pair a phone or another computer; this
            restarts the server.
          </p>
          <Button variant="primary" onClick={onStartServer}>
            Start the server
          </Button>
        </div>
      );
    case "noNetwork":
      return (
        <p className="text-sm text-fg-muted">
          The server is running, but this computer is not connected to a
          network, so no other device can reach it. Connect this computer to the
          network that the other device is on.
        </p>
      );
    case "running":
      return server.hasAccounts ? (
        <PairingAddress
          url={server.url}
          code={null}
          deviceName={server.deviceName}
        >
          <p className="text-sm text-fg-muted">
            The other device logs in with an account on this server.
          </p>
        </PairingAddress>
      ) : (
        <LaunchTokenPairing
          url={server.url}
          deviceName={server.deviceName}
          code={code}
          onNewCode={onNewCode}
        />
      );
  }
}
