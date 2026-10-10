import type { KeyPress } from "@easyimmerse/state";

/** Gathers the facts about a key press that only the page knows: what has focus, whether a dialog is open, and whether the key was handled. */
export function keyPressOf(event: KeyboardEvent): KeyPress {
  return {
    key: event.key,
    isShifted: event.shiftKey,
    hasCommandKey: event.ctrlKey || event.metaKey,
    hasAltKey: event.altKey,
    focus: focusOf(event.target),
    isDialogOpen: document.querySelector("dialog[open]") !== null,
    isHandled: event.defaultPrevented,
  };
}

function focusOf(target: EventTarget | null): KeyPress["focus"] {
  if (!(target instanceof HTMLElement)) return "page";
  if (isTextField(target)) return "textField";
  if (target.closest("[role='menu']") !== null) return "menu";
  return target.closest(pressableSelector) !== null ? "control" : "page";
}

function isTextField(element: HTMLElement): boolean {
  return (
    element.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
  );
}

/** The elements that Space already presses, such as buttons and links. */
const pressableSelector =
  "button, a[href], summary, [role='button'], [role='checkbox'], [role='switch'], [role='tab'], [role='menuitem'], [role='option']";
