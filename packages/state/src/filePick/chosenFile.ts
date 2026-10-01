import type { MediaSource, SubtitleRole } from "@easyimmerse/types";

/** What a file is being picked for. */
export type FilePickPurpose =
  | { kind: "media" }
  | { kind: "subtitles"; role: SubtitleRole }
  | { kind: "dictionary" };

/** A file the user picked. The native app gives a path; the web app stores the file in the browser and gives its key. */
export type PickedFile = { name: string; source: MediaSource };

/**
 * A picked file waiting for a component to act on it.
 * `bytes` holds the contents of a dictionary stored in the browser once they are read, and is null otherwise.
 */
export type ChosenFile = {
  purpose: FilePickPurpose;
  file: PickedFile;
  bytes: Uint8Array | null;
};
