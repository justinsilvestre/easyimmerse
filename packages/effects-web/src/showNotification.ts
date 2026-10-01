const toastDurationMs = 3000;

/** Shows the message as a toast at the bottom of the page for a few seconds. */
export function showNotification(message: string): void {
  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  toast.textContent = message;
  Object.assign(toast.style, toastStyle);
  document.body.append(toast);
  setTimeout(() => toast.remove(), toastDurationMs);
}

const toastStyle: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  bottom: "1rem",
  left: "50%",
  transform: "translateX(-50%)",
  padding: "0.5rem 1rem",
  borderRadius: "0.25rem",
  background: "#1f2937",
  color: "white",
  fontSize: "0.875rem",
};
