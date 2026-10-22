import type { BrowserFileRegistry } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import type { PathAvailabilities } from "./mediaIssueOf.ts";

/** What the project's media list knows of where a media file's bytes are, here and on a server that keeps a copy of them. */
export type MediaCopy = {
  projectId: string;
  /** Whether the person chose to keep a copy of the file on a server. */
  isUploadChosen: boolean;
  /** Whether the server the app talks to keeps a copy of the file. */
  hasStoredCopy: boolean;
  /** For a file a browser added, whether this browser still holds it; null for a file at a path. */
  browserFile: "held" | "gone" | null;
  /** Whether the server reported that it cannot read the file itself. */
  isUnreadableHere: boolean;
};

/** Describes where a media file's bytes are, from the browser's registry and what the server reported for the file. */
export function mediaCopyOf(
  mediaFile: MediaFile,
  registry: BrowserFileRegistry<File> | null,
  pathAvailabilities: PathAvailabilities,
): MediaCopy {
  const availability = pathAvailabilities.get(mediaFile.id);
  return {
    projectId: mediaFile.project_id,
    isUploadChosen: mediaFile.is_upload_chosen,
    hasStoredCopy: mediaFile.has_stored_copy,
    browserFile: browserFileOf(mediaFile, registry),
    isUnreadableHere:
      availability !== undefined &&
      availability !== "available" &&
      availability !== "stored_copy",
  };
}

function browserFileOf(
  mediaFile: MediaFile,
  registry: BrowserFileRegistry<File> | null,
): MediaCopy["browserFile"] {
  if (mediaFile.source.kind !== "browser_file") return null;
  return registry?.find(mediaFile.name, mediaFile.source) ? "held" : "gone";
}
