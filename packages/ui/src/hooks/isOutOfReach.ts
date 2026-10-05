/**
 * Tells whether a part of the page should ignore document-wide keys and clicks:
 * it is not mounted, it lies inert beneath another screen such as Settings, or a modal dialog outside it is open.
 */
export function isOutOfReach(part: Element | null): boolean {
  if (part === null || part.closest("[inert]") !== null) return true;
  const dialog = document.querySelector("dialog[open]");
  return dialog !== null && !dialog.contains(part);
}
