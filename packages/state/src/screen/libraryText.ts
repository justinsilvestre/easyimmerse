import type {
  Chapter,
  Cue,
  Document,
  LibraryItem,
  LibrarySegment,
  LibraryText,
  LibraryWord,
} from "@easyimmerse/types";
import type { ReaderLocation } from "../storedPlaces/readingLocation.ts";
import type { ChosenWord, LookupSource } from "./lookup/lookupState.ts";

/**
 * Returns the cues a video or audio item's segments make, in the target language and in the translation language, as the media screen shows them.
 * Each cue's index is its segment's index. A segment without times makes no cue, and one without a translation makes no translation cue.
 */
export function cuesOfLibraryText(text: LibraryText) {
  const timed = text.segments.filter(isTimed);
  return {
    cues: timed.map((segment) => cueOf(segment, segment.text)),
    translationCues: timed.flatMap((segment) =>
      segment.translation === null ? [] : [cueOf(segment, segment.translation)],
    ),
  };
}

/**
 * Returns the book a document item's segments make, as the reader shows it: one paragraph per segment, in the chapter the segment names,
 * or in the first chapter when it names none, and the chapters titled as the item's text titles them.
 * The book names no language, so the reader takes the project's, which is the library's language for a project the item was added to.
 */
export function documentOfLibraryText(
  text: LibraryText,
  item: Pick<LibraryItem, "title">,
): Document {
  const chapters = libraryChaptersOf(text).map((segments, index) => ({
    title: text.chapter_titles[index] ?? null,
    paragraphs: segments.map((segment) => segment.text),
  })) satisfies Chapter[];
  return { title: item.title, language: null, chapters };
}

/**
 * Returns the segments of a document item's text grouped into chapters, in order: those that name a chapter in it,
 * and those that name none in the first. The book `documentOfLibraryText` builds has one paragraph per segment, in these places.
 */
export function libraryChaptersOf(text: LibraryText): LibrarySegment[][] {
  const chapterCount = Math.max(
    text.chapter_titles.length,
    ...text.segments.map((segment) => chapterOf(segment) + 1),
  );
  return Array.from({ length: chapterCount }, (_, index) =>
    segmentsOfChapter(text, index),
  );
}

/** Returns the segment a word was chosen in: the segment of its cue, or the paragraph of its place in the book. Null when none matches. */
export function librarySegmentOf(
  text: LibraryText,
  source: LookupSource,
): LibrarySegment | null {
  if (source.kind === "cue")
    return (
      text.segments.find(({ index }) => index === source.cue.index) ?? null
    );
  return librarySegmentAt(text, source.location);
}

/** Returns the segment that makes a paragraph of the book `documentOfLibraryText` builds, or null when there is none. */
export function librarySegmentAt(
  text: LibraryText,
  {
    chapterIndex,
    paragraphIndex,
  }: Pick<ReaderLocation, "chapterIndex" | "paragraphIndex">,
): LibrarySegment | null {
  return segmentsOfChapter(text, chapterIndex)[paragraphIndex] ?? null;
}

/** Returns the word of a segment that begins at an offset of its text, in UTF-16 code units, or null when no word begins there. */
export function libraryWordAt(
  segment: LibrarySegment,
  start: number,
): LibraryWord | null {
  return segment.words.find((word) => word.start === start) ?? null;
}

/**
 * Returns what a library flashcard is made from for a word chosen in an item: its segment, and where the word begins there,
 * or null for the whole segment when the place chosen begins no word. Null when the word lies in no segment.
 */
export function libraryFlashcardPlaceOf(text: LibraryText, chosen: ChosenWord) {
  const segment = chosen.source && librarySegmentOf(text, chosen.source);
  if (!segment) return null;
  const start = chosen.occurrence?.start;
  const word = start === undefined ? null : libraryWordAt(segment, start);
  return { segmentIndex: segment.index, wordStart: word?.start ?? null };
}

type TimedSegment = LibrarySegment & { start_ms: number; end_ms: number };

function isTimed(segment: LibrarySegment): segment is TimedSegment {
  return segment.start_ms !== null && segment.end_ms !== null;
}

function cueOf({ index, start_ms, end_ms }: TimedSegment, text: string): Cue {
  return { index, start_ms, end_ms, text };
}

function segmentsOfChapter(text: LibraryText, chapterIndex: number) {
  return text.segments.filter((segment) => chapterOf(segment) === chapterIndex);
}

function chapterOf(segment: LibrarySegment): number {
  return segment.chapter_index ?? 0;
}
