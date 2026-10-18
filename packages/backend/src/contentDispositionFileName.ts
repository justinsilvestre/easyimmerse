/**
 * Reads the file name a `Content-Disposition` header gives: the UTF-8 `filename*` first, then the plain `filename`.
 * Returns the fallback when the header names none.
 */
export function contentDispositionFileName(
  header: string | null,
  fallback: string,
): string {
  if (header === null) return fallback;
  return extendedFileName(header) ?? plainFileName(header) ?? fallback;
}

function extendedFileName(header: string): string | null {
  const encoded = header.match(/filename\*\s*=\s*[^']*'[^']*'([^;\s]+)/i)?.[1];
  if (encoded === undefined) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

function plainFileName(header: string): string | null {
  const quoted = header.match(/filename\s*=\s*"((?:[^"\\]|\\.)*)"/i)?.[1];
  if (quoted !== undefined) return quoted.replace(/\\(.)/g, "$1");
  return header.match(/filename\s*=\s*([^;\s]+)/i)?.[1] ?? null;
}
