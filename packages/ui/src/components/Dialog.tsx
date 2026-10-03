import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { IconButton } from "./IconButton.tsx";

/**
 * A modal window over the current screen, built on the native dialog element so that focus, Escape, and the backdrop behave as expected.
 * The footer holds the dialog's actions.
 */
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
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open && typeof dialog.showModal === "function")
      dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // A click lands on the dialog element itself only when it is outside the content, on the backdrop.
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="m-auto w-full max-w-lg flex-col gap-4 rounded-lg border border-line bg-surface p-5 text-fg shadow-xl backdrop:bg-gray-950/50 open:flex"
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
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      {children}
      {footer && <div className="flex justify-end gap-2">{footer}</div>}
    </dialog>
  );
}
