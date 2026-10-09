import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import type { MediaIssue } from "./mediaIssueMessage.ts";

/** What the server reported about each media file at a path, by media file ID. */
export type PathAvailabilities = ReadonlyMap<
  string,
  "available" | "missing" | "unreadable"
>;

/**
 * Tells why a media file cannot be opened from this app, or returns undefined when nothing is known to stop it.
 * A file a browser holds is judged by the registry of picked files; a file at a path by what the server reported for it.
 */
export function mediaIssueOf(
  mediaFile: MediaFile,
  registry: BrowserFileRegistry<File> | null,
  pathAvailabilities: PathAvailabilities,
): MediaIssue | undefined {
  if (mediaFile.source.kind === "path")
    return pathIssues[pathAvailabilities.get(mediaFile.id) ?? "available"];
  if (registry === null) return "browserFileUnreachable";
  return registry.find(mediaFile.name, mediaFile.source) === null
    ? "browserFileNotOpen"
    : undefined;
}

const pathIssues = {
  available: undefined,
  missing: "pathMissing",
  unreadable: "pathUnreadable",
} as const;
