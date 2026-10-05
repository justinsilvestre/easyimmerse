import clsx from "clsx";
import { X } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { IconButton } from "./IconButton.tsx";
import { focusInitialControl, keepFocusInside } from "./modalFocus.ts";

/**
 * A dialog over the whole page, which leaves the page beneath inert until it closes.
 * Focus starts on the control given `autoFocus`, else on the first control of the content, stays inside,
 * and returns to where it was when the dialog closes.
 * Escape and the close button cancel; a click outside does nothing, so that a stray click cannot cancel.
 * The caller decides what cancelling means and puts the dialog's buttons in the footer.
 */
export function ModalDialog({
  title,
  description,
  onCancel,
  footer,
  isWide = false,
  children,
}: {
  title: string;
  description?: string;
  onCancel: () => void;
  footer?: ReactNode;
  /** Widens the dialog for content such as tables. */
  isWide?: boolean;
  children?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  // Read before the first commit, since a child's autoFocus moves focus during the commit.
  openerRef.current ??= document.activeElement;
  useEffect(() => {
    const opener = openerRef.current;
    if (dialogRef.current && contentRef.current)
      openModal(dialogRef.current, contentRef.current);
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    } else if (event.key === "Tab" && dialogRef.current) {
      keepFocusInside(dialogRef.current, event);
    }
  };
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={handleKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={clsx(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-4 rounded-lg border border-line bg-surface p-6 text-fg shadow-xl backdrop:bg-black/50 open:flex",
        isWide ? "max-w-2xl" : "max-w-lg",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-sm text-fg-muted">
              {description}
            </p>
          )}
        </div>
        <IconButton label="Close" onClick={onCancel}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div ref={contentRef} className="flex min-h-0 flex-col gap-4">
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          {children}
        </div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}

/**
 * Opens the dialog as a modal. Opening focuses its first control, which is the close button,
 * so focus then moves to the control a child autofocused, else to the first control of the content.
 */
function openModal(dialog: HTMLDialogElement, content: HTMLElement): void {
  const autofocused = content.contains(document.activeElement)
    ? document.activeElement
    : null;
  if (!dialog.open && typeof dialog.showModal === "function")
    dialog.showModal();
  if (autofocused instanceof HTMLElement) autofocused.focus();
  else focusInitialControl(content);
}
