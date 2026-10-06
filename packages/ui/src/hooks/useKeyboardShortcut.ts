import { type RefObject, useEffect, useRef } from "react";
import { isOutOfReach } from "./isOutOfReach.ts";

/**
 * Calls `onPress` when a key is pressed without modifiers anywhere on the page,
 * except while the user types into a field, or while the screen that `scopeRef` marks
 * lies beneath another or under a modal dialog.
 * `keys` names one key or several that do the same thing, as `KeyboardEvent.key` spells them, so " " is Space.
 * Space is left to a focused button or link, which it already presses.
 */
export function useKeyboardShortcut(
  keys: string | readonly string[],
  onPress: () => void,
  scopeRef: RefObject<Element | null>,
): void {
  const latest = useRef({ keys, onPress });
  latest.current = { keys, onPress };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isShortcut(event, latest.current.keys)) return;
      if (isOutOfReach(scopeRef.current)) return;
      event.preventDefault();
      latest.current.onPress();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [scopeRef]);
}

function isShortcut(
  event: KeyboardEvent,
  keys: string | readonly string[],
): boolean {
  const key = event.key.toLowerCase();
  const listened = typeof keys === "string" ? [keys] : keys;
  if (!listened.some((listenedKey) => listenedKey.toLowerCase() === key)) {
    return false;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isTypingTarget(event.target)) return false;
  return key !== " " || !isPressable(event.target);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/** Whether Space on the element already does something of its own, such as pressing a button. */
function isPressable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(
      "button, a[href], summary, [role='button'], [role='checkbox'], [role='switch'], [role='tab'], [role='menuitem'], [role='option']",
    ) !== null
  );
}
