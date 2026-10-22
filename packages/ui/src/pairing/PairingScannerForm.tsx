import type { PairingFields, PairingFormView } from "@easyimmerse/state";
import { ScanQrCode } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../components/Button.tsx";
import { TextField } from "../components/TextField.tsx";

const progressLabels: Partial<Record<PairingFormView["status"], string>> = {
  checkingServer: "Asking the desktop app…",
  claiming: "Pairing…",
  connecting: "Connecting…",
};

/**
 * The form through which the web and mobile apps pair with a desktop app on the local network, given its state as props:
 * a button that scans the desktop app's QR code where the device can, the camera while it scans in a browser,
 * and always an address and a code to type instead.
 */
export function PairingScannerForm({
  form,
  canScan,
  camera,
  onChange,
  onSubmit,
  onScan,
}: {
  form: PairingFormView;
  canScan: boolean;
  /** The camera view, shown while a browser scans. */
  camera?: ReactNode;
  onChange: (changes: Partial<PairingFields>) => void;
  onSubmit: () => void;
  onScan: () => void;
}) {
  const isScanning = form.status === "scanning";
  return (
    <form
      className="flex max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.canSubmit) onSubmit();
      }}
    >
      <p className="text-sm text-fg-muted">
        Open Local network sync in the easyImmerse desktop app on a computer on
        the same network, then scan its QR code or enter the address and code it
        shows.
      </p>
      {canScan && !isScanning && (
        <Button
          className="self-start"
          aria-disabled={form.isBusy || undefined}
          onClick={form.isBusy ? undefined : onScan}
        >
          <ScanQrCode className="size-4" aria-hidden />
          Scan QR code
        </Button>
      )}
      {isScanning && camera}
      <TextField
        label="Address"
        type="url"
        autoComplete="off"
        placeholder="http://192.168.1.5:8787"
        value={form.address}
        disabled={form.isBusy}
        onChange={(event) => onChange({ address: event.target.value })}
      />
      <TextField
        label="Code"
        hint="Not needed when the desktop app's server has accounts."
        autoComplete="one-time-code"
        placeholder="123 456"
        value={form.code}
        disabled={form.isBusy}
        onChange={(event) => onChange({ code: event.target.value })}
      />
      {form.message && (
        <p
          role={form.status === "failed" ? "alert" : "status"}
          className={
            form.status === "failed"
              ? "text-sm text-danger-fg"
              : "text-sm text-warning-fg"
          }
        >
          {form.message}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        aria-disabled={!form.canSubmit || undefined}
      >
        {progressLabels[form.status] ?? "Pair"}
      </Button>
    </form>
  );
}
