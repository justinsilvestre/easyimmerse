/** Where an image in dictionary markup comes from: a file stored with the dictionary, or data embedded in the markup. */
export type ImageSource =
  | { kind: "media"; path: string }
  | { kind: "embedded"; url: string };

/**
 * Reads an image `src` from dictionary markup. Remote images are refused, since loading them would reveal the reader to a server.
 * A relative path is returned without a leading slash or `file://` prefix, for the caller to find among the dictionary's files.
 */
export function imageSource(src: string): ImageSource | null {
  const trimmed = src.trim();
  if (/^data:image\//i.test(trimmed)) return { kind: "embedded", url: trimmed };
  const path = trimmed.replace(/^file:\/\//i, "");
  if (path.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(path)) return null;
  const relativePath = path.replace(/^(\.?[\\/])+/, "");
  if (!relativePath || relativePath.split(/[\\/]/).includes("..")) return null;
  return { kind: "media", path: relativePath };
}
