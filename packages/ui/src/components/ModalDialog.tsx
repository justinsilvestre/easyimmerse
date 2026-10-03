import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { focusInitialControl, keepFocusInside } from "./modalFocus.ts";

/**
 * A dialog over the whole page. Focus starts inside and stays inside; Escape cancels.
 * The caller decides what cancelling means and renders the buttons.
 */
export function ModalDialog({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) focusInitialControl(panelRef.current);
  }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    } else if (event.key === "Tab" && panelRef.current) {
      keepFocusInside(panelRef.current, event);
    }
  };
  return (
    // The key handler belongs on the dialog panel, which is the interactive region; the backdrop only dims the page.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-line bg-surface p-6 text-fg shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/** Lines the dialog's buttons up at its end, cancel first. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}
