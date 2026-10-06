/** Resolves what the promise resolves, or `fallback` when it rejects or `ms` passes first. */
export function withinTime<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<T>((resolve) => {
    timeout = setTimeout(() => resolve(fallback), ms);
  });
  const settled = promise
    .catch(() => fallback)
    .finally(() => clearTimeout(timeout));
  return Promise.race([settled, expiry]);
}
