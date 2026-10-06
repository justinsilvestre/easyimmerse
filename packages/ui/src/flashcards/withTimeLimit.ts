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
      reject(new TimeLimitError(ms));
    }, ms);
  });
  return Promise.race([
    work(controller.signal).finally(() => clearTimeout(timeout)),
    expiry,
  ]);
}

/** The rejection of work that passed its time limit, whose outcome is therefore unknown. */
export class TimeLimitError extends Error {
  constructor(ms: number) {
    super(`No answer within ${ms} ms`);
    this.name = "TimeLimitError";
  }
}
