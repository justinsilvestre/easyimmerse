import { useEffect, useRef } from "react";

type ReaderKeyHandlers = {
  isPaged: boolean;
  isPanelOpen: boolean;
  onTurn: (direction: "next" | "previous") => void;
  onOpenSearch: () => void;
  onLookup: () => void;
  onEscape: () => void;
};

/**
 * Binds the reader's keyboard shortcuts: the arrow keys, Page Up and Down, and Space turn
 * pages; Ctrl+F or Cmd+F searches the book, whose other pages the browser's own search
 * cannot see; L looks up a word. The scrolling layout leaves the scrolling keys to the browser.
 */
export function useReaderKeys(handlers: ReaderKeyHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = latest.current;
      if (event.defaultPrevented || isTyping(event.target)) return;
      const action = actionOf(event, current);
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}

function actionOf(event: KeyboardEvent, handlers: ReaderKeyHandlers) {
  if ((event.ctrlKey || event.metaKey) && event.key === "f")
    return handlers.onOpenSearch;
  if (handlers.isPanelOpen || event.ctrlKey || event.metaKey || event.altKey)
    return null;
  if (event.key === "Escape") return handlers.onEscape;
  if (event.key === "l" || event.key === "L") return handlers.onLookup;
  if (!handlers.isPaged) return null;
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
