import { pairingUrlOf } from "@easyimmerse/state";
import type { ReactNode } from "react";
import { QrCode } from "./QrCode.tsx";

/** The QR code beside the address in large text, with what else the other device needs below them. */
export function PairingAddress({
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
