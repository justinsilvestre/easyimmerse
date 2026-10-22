import { type DesktopPairingServer, pairingUrlOf } from "@easyimmerse/state";
import type { PairingCode } from "@easyimmerse/types";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { QrCode } from "./QrCode.tsx";
import { spacedCode } from "./spacedCode.ts";

/** The pairing code of a server with the launch token: being issued, issued, or refused. */
export type DesktopPairingCode =
  | { kind: "loading" }
  | { kind: "issued"; code: PairingCode }
  | { kind: "failed" };

/**
 * What the desktop app shows for pairing another device on the local network, given its state as props.
 * While the server runs on the local network, it shows the QR code and the address, and with the launch token
 * the pairing code, when the code stops being valid, and a warning that anyone on the network can use the server.
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
    case "running":
      return server.hasAccounts ? (
        <PairingAddress url={server.url} code={null}>
          <p className="text-sm text-fg-muted">
            The other device logs in with an account on this server.
          </p>
        </PairingAddress>
      ) : (
        <LaunchTokenPairing
          url={server.url}
          code={code}
          onNewCode={onNewCode}
        />
      );
  }
}

function LaunchTokenPairing({
  url,
  code,
  onNewCode,
}: {
  url: string;
  code: DesktopPairingCode;
  onNewCode: () => void;
}) {
  const issued = code.kind === "issued" ? code.code.code : null;
  return (
    <div className="flex flex-col gap-4">
      <PairingAddress url={url} code={issued}>
        <PairingCodeLine code={code} onNewCode={onNewCode} />
      </PairingAddress>
      <p
        role="note"
        className="rounded-md border border-warning-line bg-warning-soft px-3 py-2 text-sm text-warning-fg"
      >
        Anyone on your local network can access your projects, flashcards and
        dictionaries through this server. To keep them private, set up
        authentication in the server settings.
      </p>
    </div>
  );
}

/** The QR code beside the address in large text, with what else the other device needs below them. */
function PairingAddress({
  url,
  code,
  children,
}: {
  url: string;
  code: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <QrCode
        text={pairingUrlOf(url, code)}
        label="QR code for pairing another device"
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-fg-muted">
          Scan the QR code in easyImmerse on the other device, or open this
          address there:
        </p>
        <p className="text-2xl font-semibold break-all">{url}</p>
        {children}
      </div>
    </div>
  );
}

function PairingCodeLine({
  code,
  onNewCode,
}: {
  code: DesktopPairingCode;
  onNewCode: () => void;
}) {
  switch (code.kind) {
    case "loading":
      return <p className="text-sm text-fg-muted">Getting a pairing code…</p>;
    case "failed":
      return (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-danger-fg">
            The server could not give a pairing code.
          </p>
          <Button size="sm" onClick={onNewCode}>
            Try again
          </Button>
        </div>
      );
    case "issued":
      return (
        <div className="flex flex-col items-start gap-1">
          <p className="text-sm text-fg-muted">Pairing code</p>
          <p className="font-mono text-3xl font-semibold tracking-widest">
            {spacedCode(code.code.code)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-fg-muted">
              Valid until {clockTimeOf(code.code.expires_at)}, for one device.
            </p>
            <Button size="sm" onClick={onNewCode}>
              New code
            </Button>
          </div>
        </div>
      );
  }
}

function clockTimeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
