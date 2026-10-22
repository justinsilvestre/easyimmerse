import clsx from "clsx";
import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { focusInitialMenuItem, moveMenuFocusForKey } from "./menuFocus.ts";

/** What the button that opens the menu takes: its ARIA attributes and its click. */
type MenuTriggerProps = {
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string | undefined;
  onClick: () => void;
};

/** What the open menu takes: its element's ref and id, the press handler that keeps the focus in it, and the way to close it. */
type MenuPopupProps = {
  ref: RefObject<HTMLDivElement | null>;
  id: string;
  onMouseDown: (event: MouseEvent) => void;
  /** Closes the menu and returns the focus to its button, as a choice does. */
  close: () => void;
};

/**
 * The behaviour shared by the app's menu buttons, around a button and a menu that its caller draws.
 * Opening the menu focuses its selected item, or its first, and the up and down arrows, Home, and End move between the items.
 * The menu closes on Escape, on a choice, when focus moves to an element outside it,
 * or when the pointer presses anywhere outside it, which matters on browsers that give a clicked button no focus.
 * While `isUnavailable`, the menu stays closed. With `isInitiallyOpen`, it starts open.
 */
export function MenuShell({
  trigger,
  menu,
  isUnavailable = false,
  isInitiallyOpen = false,
  className,
}: {
  trigger: (props: MenuTriggerProps) => ReactNode;
  menu: (props: MenuPopupProps) => ReactNode;
  isUnavailable?: boolean;
  isInitiallyOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setOpen] = useState(isInitiallyOpen);
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
      className={clsx("relative", className)}
      onBlur={(event) => {
        // Safari and the macOS desktop app give a pressed button no focus, so a press inside the menu blurs it with no
        // element to receive the focus. Only a move of the focus to another element closes the menu; presses outside close it above.
        const next = event.relatedTarget as Node | null;
        if (next !== null && !ref.current?.contains(next)) setOpen(false);
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
      {trigger({
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
        "aria-controls": isOpen ? menuId : undefined,
        onClick: () => {
          if (!isUnavailable) setOpen(!isOpen);
        },
      })}
      {isOpen &&
        !isUnavailable &&
        menu({
          ref: menuRef,
          id: menuId,
          // Keeps the focus on the focused item while an item is pressed, so that the keys keep working.
          onMouseDown: (event) => event.preventDefault(),
          close: closeAndFocusButton,
        })}
    </div>
  );
}
