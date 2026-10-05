import { useEffect, useEffectEvent } from "react";

type ReaderKeyHandlers = {
  isPaged: boolean;
  isPanelOpen: boolean;
  onTurn: (direction: "next" | "previous") => void;
  onOpenSearch: () => void;
  onLookup: () => void;
  onEscape: () => void;
};

/**
 * Binds the reader's keyboard shortcuts.
 * The arrow keys, Page Up and Down, and Space turn pages.
 * Ctrl+F or Cmd+F searches the book, whose other pages the browser's own search cannot see.
 * L looks up a word.
 * The scrolling layout leaves the scrolling keys to the browser, and a focused control keeps the keys it uses itself.
 */
export function useReaderKeys(handlers: ReaderKeyHandlers) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    const action = actionOf(event, handlers);
    if (!action) return;
    event.preventDefault();
    action();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function actionOf(event: KeyboardEvent, handlers: ReaderKeyHandlers) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f")
    return handlers.onOpenSearch;
  if (handlers.isPanelOpen || event.ctrlKey || event.metaKey || event.altKey)
    return null;
  if (isTyping(event.target)) return null;
  if (event.key === "Escape") return handlers.onEscape;
  if (event.key === "l" || event.key === "L") return handlers.onLookup;
  if (!handlers.isPaged || isPressingButton(event)) return null;
  if (["ArrowRight", "PageDown"].includes(event.key) || isSpace(event, false))
    return () => handlers.onTurn("next");
  if (["ArrowLeft", "PageUp"].includes(event.key) || isSpace(event, true))
    return () => handlers.onTurn("previous");
  return null;
}

function isSpace(event: KeyboardEvent, withShift: boolean): boolean {
  return event.key === " " && event.shiftKey === withShift;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Whether the key is Space on a button or link, which the browser uses to press it. */
function isPressingButton(event: KeyboardEvent): boolean {
  return (
    event.key === " " &&
    event.target instanceof HTMLElement &&
    event.target.closest("button, a[href], summary") !== null
  );
}
