import type {
  LibraryDifficulty,
  LibraryItemKind,
  LibraryItemStatus,
} from "@easyimmerse/types";

/** The name of each kind of library item, as the library shows it. */
export const libraryKindLabels: Record<LibraryItemKind, string> = {
  video: "Video",
  audio: "Audio",
  document: "Text",
};

/** The name of each difficulty level. */
export const libraryDifficultyLabels: Record<LibraryDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** The name of each status of a library item, as the library management screen shows it. */
export const libraryStatusLabels: Record<LibraryItemStatus["kind"], string> = {
  draft: "Draft",
  processing: "Preparing",
  published: "Published",
  failed: "Failed",
};

/** Formats a length in milliseconds as minutes and seconds, such as `1:35`, or hours, minutes and seconds from an hour on. */
export function formatLibraryDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const [hours, minutes] = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
  ];
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}
