/**
 * Says why a change to a library item failed: that a published item must be unpublished first,
 * to wait while it is being prepared, that the server keeps no uploads, or else `fallback`.
 */
export function libraryFailureMessage(
  error: unknown,
  fallback: string,
): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  if (code === "item_published")
    return "Unpublish the item to change its file, subtitles, or words.";
  if (code === "item_processing")
    return "Wait until the item is prepared, then try again.";
  if (code === "uploads_unavailable")
    return "This server keeps no uploaded files, so it has no library.";
  if (code === "browserFileUnreachable")
    return "This app can't upload files to the library. Use the web app instead.";
  return fallback;
}
