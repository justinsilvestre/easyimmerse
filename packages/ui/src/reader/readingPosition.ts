import type { Document } from "@easyimmerse/types";

/** A place in a document: the chapter shown and the paragraph at the top of the reading area. */
export type ReadingPosition = { chapterIndex: number; paragraphIndex: number };

/** Moves a position that lies outside the document, such as one saved before the document changed, to the nearest place inside it. */
export function clampReadingPosition(
  document: Document,
  position: ReadingPosition,
): ReadingPosition {
  const chapterIndex = clampIndex(
    position.chapterIndex,
    document.chapters.length,
  );
  const paragraphCount =
    document.chapters[chapterIndex]?.paragraphs.length ?? 0;
  return {
    chapterIndex,
    paragraphIndex: clampIndex(position.paragraphIndex, paragraphCount),
  };
}

function clampIndex(index: number, count: number): number {
  return Math.max(0, Math.min(index, count - 1));
}
