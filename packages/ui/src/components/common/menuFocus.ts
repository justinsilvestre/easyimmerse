type MenuFocusMove = "first" | "last" | "next" | "previous";

const movesByKey: Partial<Record<string, MenuFocusMove>> = {
  ArrowDown: "next",
  ArrowUp: "previous",
  Home: "first",
  End: "last",
};

/**
 * Moves the focus among the items of an open menu for the up and down arrows, Home, and End, wrapping around at either end.
 * Returns whether the key was one of these.
 */
export function moveMenuFocusForKey(menu: HTMLElement, key: string): boolean {
  const move = movesByKey[key];
  if (move === undefined) return false;
  const items = menuItemsOf(menu);
  const current = items.indexOf(document.activeElement as HTMLElement);
  items[targetIndex(move, current, items.length)]?.focus();
  return true;
}

/** Focuses the selected item of a menu that has just opened, or else its first item. */
export function focusInitialMenuItem(menu: HTMLElement): void {
  const selected = menu.querySelector<HTMLElement>(
    "[role='menuitemradio'][aria-checked='true']",
  );
  (selected ?? menuItemsOf(menu)[0])?.focus();
}

function menuItemsOf(menu: HTMLElement): HTMLElement[] {
  return [...menu.querySelectorAll<HTMLElement>("[role^='menuitem']")];
}

function targetIndex(
  move: MenuFocusMove,
  current: number,
  count: number,
): number {
  if (move === "first") return 0;
  if (move === "last") return count - 1;
  if (move === "next") return (current + 1) % count;
  return current <= 0 ? count - 1 : current - 1;
}
