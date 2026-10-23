import { pairingUrlOf } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { QrCode } from "./QrCode.tsx";

/** The QR code beside the address in large text, with the name the other device will show for this computer, and what else the other device needs below them. */
export function PairingAddress({
  url,
  code,
  deviceName,
  children,
}: {
  url: string;
  code: string | null;
  /** The name paired devices show for this computer, or empty when it has none. */
  deviceName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <QrCode
        text={pairingUrlOf(url, code)}
        label="QR code for pairing another device"
      />
      <div className="flex flex-col gap-2">
        {deviceName !== "" && (
          <p className="text-sm text-fg-muted">
            Paired devices show this computer as{" "}
            <span className="font-semibold text-fg">{deviceName}</span>.
          </p>
        )}
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
