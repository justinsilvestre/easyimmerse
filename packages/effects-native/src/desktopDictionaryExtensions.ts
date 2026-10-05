/**
 * Adds the extensions of dictionaries the server reads from beside the picked file, such as a StarDict `.ifo`,
 * which the desktop app can offer because the server reads from the disk.
 */
export function desktopDictionaryExtensions(
  accept: readonly string[],
): string[] {
  return [...new Set([...accept, ".ifo"])];
}
