import clsx from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One action in a menu. A destructive action is drawn in the danger color.
 * An item with `isChecked` set is a checkbox that stays in the menu when toggled.
 * An item with `isSelected` set is one of a set of choices of which only one is selected, and choosing it closes the menu.
 */
export type MenuItem = {
  label: string;
  icon?: ReactNode;
  isDestructive?: boolean;
  isChecked?: boolean;
  isSelected?: boolean;
  /** Closes the menu when a checkbox item is chosen, as for choices of which only one can be checked. */
  closesOnSelect?: boolean;
  onSelect: () => void;
};

/** One item of an open menu: a plain action, a checkbox, or one of a set of choices. Calls `onClose` when choosing it closes the menu. */
export function MenuItemButton({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const isChecked = item.isSelected ?? item.isChecked;
  const closes =
    isChecked === undefined ||
    item.isSelected !== undefined ||
    item.closesOnSelect === true;
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked is set only with the checkbox and radio item roles, which support it.
    <button
      type="button"
      role={menuItemRole(item)}
      aria-checked={isChecked}
      onClick={() => {
        if (closes) onClose();
        item.onSelect();
      }}
      className={clsx(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left whitespace-nowrap focus-visible:outline-none",
        item.isDestructive
          ? "text-danger-fg hover:bg-danger-soft focus-visible:bg-danger-soft"
          : "hover:bg-surface-muted focus-visible:bg-surface-muted",
      )}
    >
      {isChecked !== undefined && (
        <Check
          className={clsx("size-4", !isChecked && "invisible")}
          aria-hidden
        />
      )}
      {item.icon}
      {item.label}
    </button>
  );
}

function menuItemRole(item: MenuItem): string {
  if (item.isSelected !== undefined) return "menuitemradio";
  if (item.isChecked !== undefined) return "menuitemcheckbox";
  return "menuitem";
}
