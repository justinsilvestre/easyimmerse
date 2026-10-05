/**
 * Builds the effect that asks the browser to confirm leaving the page while active.
 * Browsers show their own wording, so the warning carries no message of the app's.
 */
export function createCloseGuard(): (isActive: boolean) => void {
  const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
  return (isActive) => {
    if (isActive) window.addEventListener("beforeunload", onBeforeUnload);
    else window.removeEventListener("beforeunload", onBeforeUnload);
  };
}
