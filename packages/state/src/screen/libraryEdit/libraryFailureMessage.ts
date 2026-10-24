/** What to tell the person for each failure the library's requests can end in, by the failure's code or status. */
const messages: Record<string, string> = {
  item_published:
    "This item is published, so its file, subtitles, and words can't change while learners use it. Unpublish it, make the change, then publish it again.",
  item_processing:
    "The server is still preparing this item. Wait until its status changes, then try again.",
  uploads_unavailable:
    "This server has no place set aside for uploaded files, so it can't hold a library. Whoever runs the server can set one up.",
  browserFileUnreachable:
    "This app can't send files from your device to the library. Open easyImmerse in a web browser and upload them from there.",
  NETWORK:
    "easyImmerse couldn't reach the server. Check your internet connection, then try again.",
};

/**
 * Says what went wrong with a change to the library, why when that is known, and what the person can do next.
 * A failure with no message of its own gets `fallback`.
 */
export function libraryFailureMessage(
  error: unknown,
  fallback: string,
): string {
  const key = codeOf(error) ?? statusOf(error);
  const message =
    key !== undefined && Object.hasOwn(messages, key) ? messages[key] : null;
  return message ?? fallback;
}

function codeOf(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

function statusOf(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "status" in error
    ? String(error.status)
    : undefined;
}
