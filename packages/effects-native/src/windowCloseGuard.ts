/** The part of a Tauri window that the close guard uses. */
export type ClosableWindow = {
  onCloseRequested(
    listener: (event: { preventDefault(): void }) => Promise<void>,
  ): Promise<() => void>;
  destroy(): Promise<void>;
};

/**
 * Builds the effect that, while active, holds the desktop window open when the user closes it,
 * asks through `confirm` whether to close anyway, and closes it if so.
 * It listens for close requests from the first time it is raised.
 */
export function createWindowCloseGuard(
  window: ClosableWindow,
  confirm: () => Promise<boolean>,
): (isActive: boolean) => void {
  let isGuarding = false;
  let isListening = false;
  return (isActive) => {
    isGuarding = isActive;
    if (isListening || !isActive) return;
    isListening = true;
    window.onCloseRequested(async (event) => {
      if (!isGuarding) return;
      event.preventDefault();
      if (await confirm()) await window.destroy();
    });
  };
}
