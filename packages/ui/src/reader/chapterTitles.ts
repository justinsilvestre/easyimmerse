import type { Document } from "@easyimmerse/types";

/** The chapter's title, or "Chapter n" for a chapter without one. */
export function chapterLabelOf(
  document: Document,
  chapterIndex: number,
): string {
  return (
    document.chapters[chapterIndex]?.title ?? `Chapter ${chapterIndex + 1}`
  );
}

/**
 * The name shown for the chapter being read, in the toolbar and the progress bar.
 * A book of a single untitled chapter, such as a text file, shows no name.
 */
export function chapterTitleOf(
  document: Document,
  chapterIndex: number,
): string | null {
  return document.chapters.length > 1
    ? chapterLabelOf(document, chapterIndex)
    : (document.chapters[chapterIndex]?.title ?? null);
}
