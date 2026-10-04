import type { Document } from "@easyimmerse/types";

/** A place in a document: a character offset within a paragraph of a chapter. */
export type ReaderLocation = {
  chapterIndex: number;
  paragraphIndex: number;
  offset: number;
};

export const startOfBook: ReaderLocation = {
  chapterIndex: 0,
  paragraphIndex: 0,
  offset: 0,
};

/** The share of the document's text that lies before the location, from 0 to 1. */
export function progressAt(document: Document, location: ReaderLocation) {
  const total = characterCountOf(document);
  if (total === 0) return 0;
  return charactersBefore(document, location) / total;
}

/** The location that lies the given share of the way through the document's text. */
export function locationAtProgress(
  document: Document,
  progress: number,
): ReaderLocation {
  let remaining = Math.round(progress * characterCountOf(document));
  for (const [chapterIndex, chapter] of document.chapters.entries()) {
    for (const [paragraphIndex, paragraph] of chapter.paragraphs.entries()) {
      if (remaining < paragraph.length)
        return { chapterIndex, paragraphIndex, offset: remaining };
      remaining -= paragraph.length;
    }
  }
  return endOfBook(document);
}

/** The share of the document's text that lies before each chapter. */
export function chapterStartProgresses(document: Document): number[] {
  return document.chapters.map((_, chapterIndex) =>
    progressAt(document, { chapterIndex, paragraphIndex: 0, offset: 0 }),
  );
}

function endOfBook(document: Document): ReaderLocation {
  const chapterIndex = Math.max(0, document.chapters.length - 1);
  const paragraphs = document.chapters[chapterIndex]?.paragraphs ?? [];
  const paragraphIndex = Math.max(0, paragraphs.length - 1);
  return {
    chapterIndex,
    paragraphIndex,
    offset: paragraphs[paragraphIndex]?.length ?? 0,
  };
}

function characterCountOf(document: Document): number {
  return document.chapters.reduce(
    (sum, chapter) => sum + lengthOf(chapter.paragraphs),
    0,
  );
}

function charactersBefore(document: Document, location: ReaderLocation) {
  const earlierChapters = document.chapters
    .slice(0, location.chapterIndex)
    .reduce((sum, chapter) => sum + lengthOf(chapter.paragraphs), 0);
  const paragraphs = document.chapters[location.chapterIndex]?.paragraphs ?? [];
  return (
    earlierChapters +
    lengthOf(paragraphs.slice(0, location.paragraphIndex)) +
    location.offset
  );
}

function lengthOf(paragraphs: readonly string[]): number {
  return paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
}
