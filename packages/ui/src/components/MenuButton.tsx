import clsx from "clsx";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Button } from "./Button.tsx";
import { IconButton } from "./IconButton.tsx";
import { type MenuItem, MenuItemButton } from "./MenuItemButton.tsx";
import { MenuShell } from "./MenuShell.tsx";

/**
 * A button that opens a small menu of actions below it. With children it is a text button showing them;
 * without, it is an icon button showing `badge`, a few characters such as the current value, or else `icon`, or three dots.
 * The menu's keys and closing are those of `MenuShell`.
 * It opens downward unless told to open upward, for a button near the bottom of a scrolling area.
 * A text button's menu lines up with its start, and an icon button's with its end, unless `align` says otherwise.
 * A `heading` sits above the items as text that describes the menu, without being an item itself.
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
  heading,
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
  heading?: ReactNode;
  children?: ReactNode;
}) {
  const headingId = useId();
  return (
    <MenuShell
      isUnavailable={isUnavailable}
      trigger={(triggerProps) =>
        children ? (
          <Button
            size={size}
            variant="subtle"
            aria-disabled={isUnavailable || undefined}
            {...triggerProps}
          >
            {children}
            <ChevronDown className="size-3" aria-hidden />
          </Button>
        ) : (
          <IconButton
            label={label}
            aria-disabled={isUnavailable || undefined}
            {...triggerProps}
            className={clsx(
              badge !== undefined &&
                "w-auto min-w-8 px-1.5 text-xs font-semibold tabular-nums pointer-coarse:w-auto pointer-coarse:min-w-11",
            )}
          >
            {badge ?? icon}
          </IconButton>
        )
      }
      menu={({ close, ...menuProps }) => (
        <div
          {...menuProps}
          role="menu"
          aria-label={label}
          aria-describedby={heading ? headingId : undefined}
          className={clsx(
            "absolute z-20 min-w-40 rounded-md border border-line bg-surface py-1 text-sm text-fg shadow-lg",
            opensUpward ? "bottom-full mb-1" : "top-full mt-1",
            (align ?? (children ? "start" : "end")) === "start"
              ? "left-0"
              : "right-0",
          )}
        >
          {heading && (
            <div
              id={headingId}
              role="none"
              className="mb-1 border-b border-line px-3 pt-1 pb-2 text-xs text-fg-muted"
            >
              {heading}
            </div>
          )}
          {items.map((item) => (
            <div key={item.label} role="none">
              <MenuItemButton item={item} onClose={close} />
            </div>
          ))}
        </div>
      )}
    />
  );
}
