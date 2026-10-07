import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../components/IconButton.tsx";
import { dictionaryFormatLabels } from "./dictionaryItem.ts";

/** Says that a file is in a format the app cannot read, until dismissed. */
export function UnsupportedFileNotice({
  fileName,
  onDismiss,
}: {
  fileName: string;
  onDismiss: () => void;
}) {
  const formats = Object.values(dictionaryFormatLabels).join(", ");
  return (
    <ImportAlert onDismiss={onDismiss}>
      <strong>{fileName}</strong> is not in a format the app can read. Supported
      formats: {formats}. A plugin may add support for others.
    </ImportAlert>
  );
}

/** Says why a file could not be added, until dismissed. */
export function FailedImportNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return <ImportAlert onDismiss={onDismiss}>{message}</ImportAlert>;
}

function ImportAlert({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-fg"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="flex-1">{children}</span>
      <IconButton label="Dismiss" onClick={onDismiss}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}
