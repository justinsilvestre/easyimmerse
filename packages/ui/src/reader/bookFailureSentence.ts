const failureSentences: Record<string, string> = {
  browserFileUnreachable:
    "This file was added in a web browser, and this app cannot reach it.",
  browserFileGone:
    "This file is no longer open in the browser. Add it again to read it.",
  OFFLINE:
    "This file lies on a computer's disk, and only the easyImmerse server can read it.",
  NETWORK: "The easyImmerse server could not be reached.",
  400: "The file could not be read as an ebook or a text file.",
  403: "This server does not allow reading files from its own disk.",
  404: "The file was not found. It may have been moved or deleted.",
};

/** Returns a plain sentence saying why a book could not be opened, from the error its parse ended with. */
export function bookFailureSentence(error: unknown): string {
  const { status, code, message } = (error ?? {}) as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };
  const known =
    failureSentences[String(code)] ?? failureSentences[String(status)];
  if (known !== undefined) return known;
  return status !== undefined && typeof message === "string"
    ? message
    : "The file could not be read.";
}
