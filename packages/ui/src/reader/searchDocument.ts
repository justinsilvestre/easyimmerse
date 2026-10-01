import type { Document } from "@easyimmerse/types";
import type { ReadingPosition } from "./readingPosition.ts";

/** Returns the position of every paragraph containing the query, ignoring letter case and surrounding spaces. */
export function searchDocument(
  document: Document,
  query: string,
): ReadingPosition[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];
  return document.chapters.flatMap((chapter, chapterIndex) =>
    chapter.paragraphs.flatMap((paragraph, paragraphIndex) =>
      paragraph.toLowerCase().includes(needle)
        ? [{ chapterIndex, paragraphIndex }]
        : [],
    ),
  );
}
