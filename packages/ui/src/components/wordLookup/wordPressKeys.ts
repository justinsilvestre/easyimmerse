import type { KeyboardEvent } from "react";

/**
 * Presses a word with Enter, or with Space once it is released, as the browser presses a button.
 * A word is not a `<button>`, so that its text can wrap across lines like the text around it; it has to be pressed by these handlers instead.
 * The press is a click with no mouse button count, as the browser's own key press on a button is, and it carries Shift when Shift is held.
 */
export const wordPressKeyHandlers = {
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
    if (!isPressKey(event)) return;
    // Space would otherwise scroll the page.
    event.preventDefault();
    if (event.key === "Enter") press(event);
  },
  onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
    if (isPressKey(event) && event.key === " ") press(event);
  },
};

function isPressKey(event: KeyboardEvent<HTMLElement>): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key === "Enter" || event.key === " ";
}

function press(event: KeyboardEvent<HTMLElement>) {
  const click = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    detail: 0,
    shiftKey: event.shiftKey,
  });
  event.currentTarget.dispatchEvent(click);
}
