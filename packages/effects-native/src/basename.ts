/** Returns the last segment of a path, accepting both slash and backslash separators. */
export function basename(path: string): string {
  const segments = path.split(/[/\\]/);
  return segments[segments.length - 1] ?? path;
}
