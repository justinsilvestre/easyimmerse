/** Wraps a callback so that it runs only once calls have paused for the given delay, with the arguments of the last call. */
export function debounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): ((...args: Args) => void) & { cancel(): void } {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timeout);
  const debounced = (...args: Args) => {
    cancel();
    timeout = setTimeout(() => callback(...args), delayMs);
  };
  return Object.assign(debounced, { cancel });
}
