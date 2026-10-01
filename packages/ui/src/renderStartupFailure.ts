/**
 * Replaces the page with a plain message when the app cannot start,
 * so a failed load never leaves a blank page.
 * The error is also logged for debugging.
 */
export function renderStartupFailure(error: unknown): void {
  console.error(error);
  const message = document.createElement("p");
  message.setAttribute("role", "alert");
  message.className = "m-6 font-sans text-danger-fg";
  message.textContent = `easyImmerse could not start: ${describeError(error)}`;
  document.body.replaceChildren(message);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
