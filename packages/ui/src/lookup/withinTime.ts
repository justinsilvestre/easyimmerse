/** Resolves what the promise resolves, or `fallback` when it rejects or `ms` passes first. */
export function withinTime<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  const timeout = new Promise<T>((resolve) =>
    setTimeout(() => resolve(fallback), ms),
  );
  return Promise.race([promise.catch(() => fallback), timeout]);
}
