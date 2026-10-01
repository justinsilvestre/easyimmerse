/** Resolves true once the element finishes any pending seek, or false when the seek takes longer than the timeout. */
export function waitForSeek(
  element: HTMLMediaElement,
  timeoutMs: number,
): Promise<boolean> {
  if (!element.seeking) return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (finished: boolean) => {
      clearTimeout(timer);
      element.removeEventListener("seeked", onSeeked);
      resolve(finished);
    };
    const onSeeked = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    element.addEventListener("seeked", onSeeked);
  });
}
