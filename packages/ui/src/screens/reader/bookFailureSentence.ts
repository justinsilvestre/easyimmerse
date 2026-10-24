import { browserFileNotices } from "../../lib/mediaIssues/browserFileNotices.ts";

const failureSentences: Record<string, string> = {
  browserFileUnreachable: browserFileNotices.unreachable,
  browserFileGone: browserFileNotices.notOpen("read"),
  OFFLINE:
    "This file lies on a computer's disk, and only the easyImmerse server can read it.",
  NETWORK: "The easyImmerse server could not be reached.",
  NO_DATA: "The server's answer could not be read. Try again.",
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
