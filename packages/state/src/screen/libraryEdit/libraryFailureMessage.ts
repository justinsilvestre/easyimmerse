/** Why, and what to do next, for each failure the library's requests can end in, by the failure's code or status.
 * Each reads on from a sentence that names the library item, so "it" is the item. */
const messages: Record<string, string> = {
  item_published:
    "It is published, so its file, subtitles and words can't change while learners use it. Unpublish it, make the change, then publish it again.",
  item_processing:
    "The server is still preparing it for learners. Wait until its status changes, then try again.",
  uploads_unavailable:
    "This server has no place set aside for uploaded files, so it can't hold a library. Whoever runs the server can set one up.",
  browserFileUnreachable:
    "This app can't send files from your device to the library. Open easyImmerse in a web browser and upload them from there.",
  NETWORK:
    "easyImmerse couldn't reach the server. Check your internet connection, then try again.",
};

/**
 * Says what went wrong with a change to a library item: `didntHappen`, a sentence naming what did not happen,
 * then why when the failure is a known one, with what the person can do about it.
 * `didntHappen` names the item, since the reasons refer back to it. A failure with no message of its own gets `nextStep`, which tells to try again.
 */
export function libraryFailureMessage(
  error: unknown,
  didntHappen: string,
  nextStep = "Try again in a moment.",
): string {
  const key = codeOf(error) ?? statusOf(error);
  const known =
    key !== undefined && Object.hasOwn(messages, key) ? messages[key] : null;
  return `${didntHappen} ${known ?? nextStep}`;
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
