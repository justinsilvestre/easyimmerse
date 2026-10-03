const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function findFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
}

/** Focuses the first control in the container unless focus is already inside it, as with an autofocused button. */
export function focusInitialControl(container: HTMLElement): void {
  if (container.contains(document.activeElement)) return;
  findFocusable(container)[0]?.focus();
}

/** Keeps a Tab key press inside the container by wrapping from its last control to its first and back. */
export function keepFocusInside(
  container: HTMLElement,
  event: { shiftKey: boolean; preventDefault: () => void },
): void {
  const focusable = findFocusable(container);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
