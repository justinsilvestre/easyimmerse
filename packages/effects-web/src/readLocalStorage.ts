/** Returns the page's local storage, or null when the browser blocks it, which makes reading `localStorage` throw. */
export function readLocalStorage(
  scope: { readonly localStorage?: Storage } = globalThis,
): Storage | null {
  try {
    return scope.localStorage ?? null;
  } catch {
    return null;
  }
}
