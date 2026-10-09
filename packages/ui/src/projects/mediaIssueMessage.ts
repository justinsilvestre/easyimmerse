import { browserFileNotices } from "../media/browserFileNotices.ts";
import type { MediaItem } from "./MediaList.tsx";

/** A reason a media file cannot be opened from this app. */
export type MediaIssue =
  | "browserFileUnreachable"
  | "browserFileNotOpen"
  | "pathMissing"
  | "pathNotAllowed"
  | "pathUnreadable";

/** The sentence telling the user why a file of the given kind cannot be opened. */
export function mediaIssueMessage(
  issue: MediaIssue,
  kind: MediaItem["kind"],
): string {
  const isBook = kind === "ebook";
  switch (issue) {
    case "browserFileUnreachable":
      return browserFileNotices.unreachable;
    case "browserFileNotOpen":
      return browserFileNotices.notOpen(isBook ? "read" : "play");
    case "pathMissing":
      return "This file was not found at its path. It may have been moved or deleted.";
    case "pathNotAllowed":
      return `This server does not read files on its machine, so this file cannot ${isBook ? "be read" : "play"} here.`;
    case "pathUnreadable":
      return "This file could not be read at its path.";
  }
}
