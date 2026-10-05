import { useEffect, useRef } from "react";

/**
 * Calls `onPress` when a single key is pressed without modifiers anywhere on the page,
 * except while the user types into a field.
 */
export function useKeyboardShortcut(key: string, onPress: () => void): void {
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isShortcut(event, key)) return;
      event.preventDefault();
      onPressRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key]);
}

function isShortcut(event: KeyboardEvent, key: string): boolean {
  if (event.key.toLowerCase() !== key.toLowerCase()) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !isTypingTarget(event.target);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}
