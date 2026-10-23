import { PairingAddress } from "./PairingAddress.tsx";
import {
  type DesktopPairingCode,
  PairingCodeLine,
} from "./PairingCodeLine.tsx";

/** Pairing with a server that has only the launch token: the address with the pairing code, and a warning that anyone on the network can use the server. */
export function LaunchTokenPairing({
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
        dictionaries through this server. To keep them private, choose Accounts
        under Authentication in the Server section of Settings.
      </p>
    </div>
  );
}
