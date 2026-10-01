const longestShownDataUrl = 1024;

/**
 * Replaces binary data and long data URLs anywhere in a plain value with short placeholders, such as "<Uint8Array 38444501 bytes>".
 * Objects and arrays that contain neither come back unchanged.
 */
export function sanitizeForDevTools(value: unknown): unknown {
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer)
    return `<${value.constructor.name} ${value.byteLength} bytes>`;
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return sanitizeArray(value);
  if (isPlainObject(value)) return sanitizeObject(value);
  return value;
}

function sanitizeString(text: string): string {
  return text.startsWith("data:") && text.length > longestShownDataUrl
    ? `<data URL ${text.length} characters>`
    : text;
}

function sanitizeArray(items: readonly unknown[]): readonly unknown[] {
  const sanitized = items.map(sanitizeForDevTools);
  return sanitized.every((item, index) => item === items[index])
    ? items
    : sanitized;
}

function sanitizeObject(
  object: Record<string, unknown>,
): Record<string, unknown> {
  const entries = Object.entries(object);
  const sanitized = entries.map(([key, item]) => [
    key,
    sanitizeForDevTools(item),
  ]);
  return sanitized.every(([key, item]) => item === object[key as string])
    ? object
    : Object.fromEntries(sanitized);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
