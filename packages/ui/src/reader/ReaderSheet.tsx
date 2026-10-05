import clsx from "clsx";
import { X } from "lucide-react";
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";
import { IconButton } from "../components/IconButton.tsx";
import {
  focusInitialControl,
  keepFocusInside,
} from "../components/modalFocus.ts";

/**
 * A panel that slides over the text: on a wide screen from the side, or as a card under the
 * toolbar; on a phone from the bottom. It lies over the page rather than beside it, so
 * opening it does not move the text.
 * Escape, the close button, and a click beside it close it, and focus returns to where it was.
 */
export function ReaderSheet({
  title,
  placement,
  initialFocus,
  onClose,
  children,
}: {
  title: string;
  placement: "left" | "right" | "card";
  /** The control to focus on opening. The first control when absent. */
  initialFocus?: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement;
    if (initialFocus?.current) initialFocus.current.focus();
    else if (panel.current) focusInitialControl(panel.current);
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [initialFocus]);
  return (
    <div className="fixed inset-0 z-30 flex items-end md:items-stretch">
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        tabIndex={-1}
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-black/30 transition-opacity duration-300 starting:opacity-0",
          placement === "card" ? "md:bg-transparent" : "md:bg-black/10",
        )}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "Tab" && panel.current) {
            keepFocusInside(panel.current, event);
          }
        }}
        className={clsx(
          "relative flex max-h-[85dvh] w-full flex-col rounded-t-xl border-line bg-surface text-fg shadow-2xl transition-[translate,opacity] duration-300 ease-out starting:translate-y-full md:max-h-none md:w-96 md:rounded-none md:starting:translate-y-0",
          placement === "left" && "md:border-r md:starting:-translate-x-full",
          placement === "right" &&
            "md:ml-auto md:border-l md:starting:translate-x-full",
          placement === "card" &&
            "md:absolute md:top-14 md:right-3 md:w-80 md:rounded-xl md:border md:pb-2 md:starting:opacity-0",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-surface-strong md:hidden" />
        <header className="flex items-center gap-2 px-4 pt-2 pb-1 md:pt-3">
          <h2 id={titleId} className="flex-1 font-semibold">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </header>
        {children}
      </div>
    </div>
  );
}
