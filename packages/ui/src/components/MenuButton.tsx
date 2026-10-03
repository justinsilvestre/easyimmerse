import clsx from "clsx";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";

/** One action in a menu. A destructive action is drawn in the danger color. */
export type MenuItem = {
  label: string;
  icon?: ReactNode;
  isDestructive?: boolean;
  onSelect: () => void;
};

/**
 * A button that opens a small menu of actions below it. With children it is a text button showing them;
 * without, it is an icon button. The menu closes on Escape, on a choice, or when focus leaves it.
 * It opens downward unless told to open upward, for a button near the bottom of a scrolling area.
 */
export function MenuButton({
  label,
  items,
  opensUpward = false,
  children,
}: {
  label: string;
  items: readonly MenuItem[];
  opensUpward?: boolean;
  children?: ReactNode;
}) {
  const [isOpen, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  return (
    // The handlers only close the menu; the button and the items inside are the interactive elements.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      ref={ref}
      className="relative"
      onBlur={(event) => {
        if (!ref.current?.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {children ? (
        <Button
          size="sm"
          variant="subtle"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => setOpen(!isOpen)}
        >
          {children}
          <ChevronDown className="size-3" aria-hidden />
        </Button>
      ) : (
        <IconButton
          label={label}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => setOpen(!isOpen)}
        >
          <MoreHorizontal className="size-4" />
        </IconButton>
      )}
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={clsx(
            "absolute z-20 min-w-40 rounded-md border border-line bg-surface py-1 text-sm shadow-lg",
            opensUpward ? "bottom-full mb-1" : "top-full mt-1",
            children ? "left-0" : "right-0",
          )}
        >
          {items.map((item) => (
            <div key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={
                  item.isDestructive
                    ? "flex w-full items-center gap-2 px-3 py-1.5 text-left text-danger-fg hover:bg-danger-soft focus-visible:bg-danger-soft focus-visible:outline-none"
                    : "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                }
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
