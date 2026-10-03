import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton.tsx";

/** A modal window over the current screen. The footer holds the dialog's actions. */
export function Dialog({
  title,
  description,
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-gray-950/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative flex w-full max-w-lg flex-col gap-4 rounded-lg border border-line bg-surface p-5 text-fg shadow-xl"
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="dialog-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-fg-muted">{description}</p>
            )}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
