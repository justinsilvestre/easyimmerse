import { type KeyboardEvent, useRef, useState } from "react";

/**
 * Keeps exactly one of a group of items in the tab order, so that Tab enters and leaves the group in one step.
 * The arrow keys move focus between the items, and Home and End move it to the first and last item.
 * Focus does not wrap around at either end. Whichever item last received focus becomes the tab stop.
 */
export function useRovingTabIndex(itemCount: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = useRef<(HTMLElement | null)[]>([]);
  const tabStopIndex = Math.min(currentIndex, itemCount - 1);
  const handleKeyDown = (event: KeyboardEvent) => {
    const targetIndex = findRovingTargetIndex(
      event.key,
      tabStopIndex,
      itemCount,
    );
    if (targetIndex === undefined || hasModifierKey(event)) return;
    event.preventDefault();
    event.stopPropagation();
    items.current[targetIndex]?.focus();
  };
  return {
    tabIndexOf: (index: number) => (index === tabStopIndex ? 0 : -1),
    itemRef: (index: number) => (element: HTMLElement | null) => {
      items.current[index] = element;
    },
    handleItemFocused: setCurrentIndex,
    handleKeyDown,
  };
}

/** Returns the index of the item a key moves focus to, or `undefined` when the key does not move focus. */
export function findRovingTargetIndex(
  key: string,
  currentIndex: number,
  itemCount: number,
): number | undefined {
  const lastIndex = itemCount - 1;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return Math.min(currentIndex + 1, lastIndex);
    case "ArrowLeft":
    case "ArrowUp":
      return Math.max(currentIndex - 1, 0);
    case "Home":
      return 0;
    case "End":
      return lastIndex;
    default:
      return undefined;
  }
}

function hasModifierKey(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
