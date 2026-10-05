/**
 * Starts `work` with a signal, and settles as it does, or rejects once `ms` has passed without it settling.
 * The signal aborts at that point, so that work which can be stopped is stopped.
 */
export function withTimeLimit<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`No answer within ${ms} ms`));
    }, ms);
  });
  return Promise.race([
    work(controller.signal).finally(() => clearTimeout(timeout)),
    expiry,
  ]);
}
