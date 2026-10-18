/**
 * Returns the key under which the server cache stores a query's entry.
 * Equal arguments give equal keys whatever the order of their objects' keys.
 * The backend's API stores its entries under these keys, so that state code can find them.
 */
export function cacheKey(endpointName: string, queryArgs: unknown): string {
  return `${endpointName}(${JSON.stringify(queryArgs, sortKeys)})`;
}

function sortKeys(_key: string, value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => (left < right ? -1 : 1)),
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
