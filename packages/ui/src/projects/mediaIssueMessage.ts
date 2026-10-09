import { browserFileNotices } from "../media/browserFileNotices.ts";

/** A reason a media file cannot be opened from this app. */
export type MediaIssue =
  | "browserFileUnreachable"
  | "browserFileNotOpen"
  | "pathMissing"
  | "pathUnreadable";

/** The sentence telling the user why a file of the given kind cannot be opened. */
export function mediaIssueMessage(
  issue: MediaIssue,
  kind: "video" | "audio" | "ebook",
): string {
  switch (issue) {
    case "browserFileUnreachable":
      return browserFileNotices.unreachable;
    case "browserFileNotOpen":
      return browserFileNotices.notOpen(kind === "ebook" ? "read" : "play");
    case "pathMissing":
      return "This file was not found at its path. It may have been moved or deleted.";
    case "pathUnreadable":
      return "This server does not read files on its machine, so this file cannot play here.";
  }
}
