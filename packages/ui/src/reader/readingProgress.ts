import type { ReaderLocation } from "@easyimmerse/state";
import type { Document } from "@easyimmerse/types";

export type { ReaderLocation };

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

/**
 * The nearest location within the document: the location itself when it lies within it.
 * A saved place can lie past the end of the book, for example when the file has changed since.
 */
export function clampToBook(
  document: Document,
  location: ReaderLocation,
): ReaderLocation {
  const { chapterIndex, paragraphIndex, offset } = location;
  const paragraphs = document.chapters[chapterIndex]?.paragraphs;
  if (paragraphs === undefined) return endOfBook(document);
  const paragraph = paragraphs[paragraphIndex];
  if (paragraph === undefined) return endOfChapter(chapterIndex, paragraphs);
  if (offset <= paragraph.length) return location;
  return { chapterIndex, paragraphIndex, offset: paragraph.length };
}

function endOfBook(document: Document): ReaderLocation {
  const chapterIndex = Math.max(0, document.chapters.length - 1);
  return endOfChapter(
    chapterIndex,
    document.chapters[chapterIndex]?.paragraphs ?? [],
  );
}

function endOfChapter(
  chapterIndex: number,
  paragraphs: readonly string[],
): ReaderLocation {
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
