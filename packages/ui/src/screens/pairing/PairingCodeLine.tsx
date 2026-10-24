import type { PairingCode } from "@easyimmerse/types";
import { Button } from "../../components/common/Button.tsx";
import { clockTimeOf } from "./clockTimeOf.ts";
import { spacedCode } from "./spacedCode.ts";

/** The pairing code of a server with the launch token: being issued, issued, or refused. */
export type DesktopPairingCode =
  | { kind: "loading" }
  | { kind: "issued"; code: PairingCode }
  | { kind: "failed" };

/** The pairing code in large digits with the time it stops being valid, or why there is none, with a button that asks for a new one. */
export function PairingCodeLine({
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
