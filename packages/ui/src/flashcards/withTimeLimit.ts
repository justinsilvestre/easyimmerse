/** Settles as the promise does, or rejects once `ms` has passed without it settling. */
export function withTimeLimit<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`No answer within ${ms} ms`)),
      ms,
    );
  });
  return Promise.race([promise.finally(() => clearTimeout(timeout)), expiry]);
}
