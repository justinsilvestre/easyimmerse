import { type RefObject, useEffect, useRef } from "react";

/** What the media screen's keys do. */
export type MediaShortcuts = {
  onTogglePlay: () => void;
  onLookup: () => void;
  onEscape: () => void;
};

/**
 * Space plays or pauses, L opens the lookup, and Escape closes what is open, unless a field, a button,
 * or another control that uses the key has focus.
 */
export function useMediaShortcuts(
  shortcuts: MediaShortcuts,
  /** An element of the screen; the keys do nothing while it is inert, as under the Settings overlay. */
  screenRef: RefObject<HTMLElement | null>,
): void {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (screenRef.current?.closest("[inert]")) return;
      const action = actionOf(event.key, event.target);
      if (action === null) return;
      event.preventDefault();
      latest.current[action]();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [screenRef]);
}

function actionOf(
  key: string,
  target: EventTarget | null,
): keyof MediaShortcuts | null {
  if (key === "Escape") return "onEscape";
  if (isControl(target)) return null;
  if (key === " ") return "onTogglePlay";
  if (key === "l" || key === "L") return "onLookup";
  return null;
}

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

/** Whether the key belongs to the focused element, such as a typed letter in a field or Space on a button. */
function isControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, button, [role=slider]") !== null
  );
}
