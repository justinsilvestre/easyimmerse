import clsx from "clsx";
import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";

/**
 * One action in a menu. A destructive action is drawn in the danger color.
 * An item with `isChecked` set is a checkbox that stays in the menu when toggled.
 */
export type MenuItem = {
  label: string;
  icon?: ReactNode;
  isDestructive?: boolean;
  isChecked?: boolean;
  /** Closes the menu when a checkbox item is chosen, as for choices of which only one can be checked. */
  closesOnSelect?: boolean;
  onSelect: () => void;
};

/**
 * A button that opens a small menu of actions below it. With children it is a text button showing them;
 * without, it is an icon button showing `icon`, or three dots. The menu closes on Escape, on a choice, when focus leaves it,
 * or when the pointer presses anywhere outside it, which matters on browsers that give a clicked button no focus.
 * It opens downward unless told to open upward, for a button near the bottom of a scrolling area.
 * A text button's menu lines up with its start, and an icon button's with its end, unless `align` says otherwise.
 */
export function MenuButton({
  label,
  icon = <MoreHorizontal className="size-4" />,
  size = "sm",
  items,
  opensUpward = false,
  align,
  isUnavailable = false,
  children,
}: {
  label: string;
  icon?: ReactNode;
  /** The size of a text button, as `Button` sizes it. */
  size?: "sm" | "md";
  items: readonly MenuItem[];
  opensUpward?: boolean;
  /** Which edge of the button the menu lines up with, as for a button at the start of a bar. */
  align?: "start" | "end";
  /** Keeps the menu closed and marks its button unavailable, keeping keyboard focus on it. */
  isUnavailable?: boolean;
  children?: ReactNode;
}) {
  const [isOpen, setOpen] = useState(false);
  const toggle = () => {
    if (!isUnavailable) setOpen(!isOpen);
  };
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node | null)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [isOpen]);
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
          size={size}
          variant="subtle"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          aria-disabled={isUnavailable || undefined}
          onClick={toggle}
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
          aria-disabled={isUnavailable || undefined}
          onClick={toggle}
        >
          {icon}
        </IconButton>
      )}
      {isOpen && !isUnavailable && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={clsx(
            "absolute z-20 min-w-40 rounded-md border border-line bg-surface py-1 text-sm text-fg shadow-lg",
            opensUpward ? "bottom-full mb-1" : "top-full mt-1",
            (align ?? (children ? "start" : "end")) === "start"
              ? "left-0"
              : "right-0",
          )}
        >
          {items.map((item) => (
            <div key={item.label} role="none">
              {item.isChecked === undefined ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={itemClassName(item)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={item.isChecked}
                  onClick={() => {
                    if (item.closesOnSelect) setOpen(false);
                    item.onSelect();
                  }}
                  className={itemClassName(item)}
                >
                  <Check
                    className={clsx("size-4", !item.isChecked && "invisible")}
                    aria-hidden
                  />
                  {item.icon}
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function itemClassName(item: MenuItem): string {
  return clsx(
    "flex w-full items-center gap-2 px-3 py-1.5 text-left whitespace-nowrap focus-visible:outline-none",
    item.isDestructive
      ? "text-danger-fg hover:bg-danger-soft focus-visible:bg-danger-soft"
      : "hover:bg-surface-muted focus-visible:bg-surface-muted",
  );
}
