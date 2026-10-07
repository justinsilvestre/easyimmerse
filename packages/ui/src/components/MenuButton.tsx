import clsx from "clsx";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";
import { type MenuItem, MenuItemButton } from "./MenuItemButton.tsx";
import { focusInitialMenuItem, moveMenuFocusForKey } from "./menuFocus.ts";

/**
 * A button that opens a small menu of actions below it. With children it is a text button showing them;
 * without, it is an icon button showing `badge`, a few characters such as the current value, or else `icon`, or three dots.
 * Opening the menu focuses its selected item, or its first, and the up and down arrows, Home, and End move between the items.
 * The menu closes on Escape, on a choice, when focus leaves it,
 * or when the pointer presses anywhere outside it, which matters on browsers that give a clicked button no focus.
 * It opens downward unless told to open upward, for a button near the bottom of a scrolling area.
 * A text button's menu lines up with its start, and an icon button's with its end, unless `align` says otherwise.
 */
export function MenuButton({
  label,
  icon = <MoreHorizontal className="size-4" />,
  badge,
  size = "sm",
  items,
  opensUpward = false,
  align,
  isUnavailable = false,
  children,
}: {
  label: string;
  icon?: ReactNode;
  badge?: string;
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
  const menuRef = useRef<HTMLDivElement>(null);
  const closeAndFocusButton = () => {
    setOpen(false);
    ref.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
  };
  useEffect(() => {
    if (isOpen && menuRef.current) focusInitialMenuItem(menuRef.current);
  }, [isOpen]);
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
        if (event.key === "Escape") closeAndFocusButton();
        else if (
          menuRef.current &&
          moveMenuFocusForKey(menuRef.current, event.key)
        )
          event.preventDefault();
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
          className={clsx(
            badge !== undefined &&
              "w-auto min-w-8 px-1.5 text-xs font-semibold tabular-nums pointer-coarse:w-auto pointer-coarse:min-w-11",
          )}
        >
          {badge ?? icon}
        </IconButton>
      )}
      {isOpen && !isUnavailable && (
        <div
          ref={menuRef}
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
              <MenuItemButton item={item} onClose={closeAndFocusButton} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
