/** What to tell the person for each failure the library's requests can end in, by the failure's code or status, given the quoted title of the item. */
const messages: Record<string, (title: string) => string> = {
  item_published: (title) =>
    `${title} is published, so its file, subtitles and words can't change while learners use it. Unpublish it, make the change, then publish it again.`,
  item_processing: (title) =>
    `The server is still preparing ${title} for learners. Wait until its status changes, then try again.`,
  uploads_unavailable: () =>
    "This server has no place set aside for uploaded files, so it can't hold a library. Whoever runs the server can set one up.",
  browserFileUnreachable: () =>
    "This app can't send files from your device to the library. Open easyImmerse in a web browser and upload them from there.",
  NETWORK: () =>
    "easyImmerse couldn't reach the server. Check your internet connection, then try again.",
};

/**
 * Says what went wrong with a change to a library item, why when that is known, and what the person can do next.
 * `title` names the item, as in "“Im Park”". A failure with no message of its own gets `fallback`.
 */
export function libraryFailureMessage(
  error: unknown,
  fallback: string,
  title: string,
): string {
  const key = codeOf(error) ?? statusOf(error);
  const message =
    key !== undefined && Object.hasOwn(messages, key) ? messages[key] : null;
  return message ? message(title) : fallback;
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
