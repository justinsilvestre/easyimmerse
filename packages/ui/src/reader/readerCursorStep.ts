import type {
  ReaderCursorStep,
  ReaderLocation,
  TextDirection,
  TextStep,
} from "@easyimmerse/state";
import { runLookupStarts } from "../components/runLookupStarts.ts";
import type { WordSpan } from "../components/splitAtWords.ts";
import { stepTextCursor } from "../components/textCursorStep.ts";
import type { ChapterSection } from "./chapterSections.ts";
import { isUnspacedWord } from "./isUnspacedWord.ts";
import { matchedSpanEnd } from "./readerWordHighlight.ts";
import { storedSpansOf } from "./storedWords.ts";
import { sentencesOf, wordsOf } from "./wordAt.ts";

/** The lookup cursor in a chapter's text: where it lies, and how much text its lookup matched, if known. */
export type ReaderTextCursor = {
  location: ReaderLocation;
  matchedLength?: number | null;
};

/**
 * Looks up from a place in the text and resolves to the length of the text the lookup matched, or null when it matched nothing;
 * or returns null at once when the text is not looked up.
 */
export type MatchedLengthAtLocation = (
  location: ReaderLocation,
) => Promise<number | null> | null;

/** A landing of the cursor: a place, a place still to be found by lookups, or null for none. */
export type CursorLanding =
  | ReaderLocation
  | Promise<ReaderLocation | null>
  | null;

/** The text of a chapter, or of the section of one that is shown, in which the cursor moves. */
export type ChapterText = {
  chapterIndex: number;
  paragraphs: readonly string[];
  section: ChapterSection;
  language: string;
  /** The stored words of each paragraph, as for a library document, which alone are words; unset to find them by the language. */
  storedWords?: readonly (readonly WordSpan[])[];
};

const wordForward: TextStep = { direction: "forward", unit: "word" };
const wordBackward: TextStep = { direction: "backward", unit: "word" };
const noLookups: MatchedLengthAtLocation = () => null;

/**
 * Where the lookup cursor lands after one step through the text, within its section.
 * A step by a word or a character moves as `stepTextCursor` moves within a paragraph, and on into the next or previous paragraph
 * at either end. A step by a sentence moves to the first word of the next or previous sentence, in this paragraph or the next or previous.
 * The landing comes as a promise when it needs lookups, as a step backward by a word through a run of a script written without spaces does.
 * Null when nothing lies that way within the section.
 */
export function stepReaderCursor(
  text: ChapterText,
  cursor: ReaderTextCursor,
  step: ReaderCursorStep,
  matchedLengthAt: MatchedLengthAtLocation,
): CursorLanding {
  const { paragraphIndex, offset } = cursor.location;
  if (step.unit === "sentence")
    return stepSentence(text, paragraphIndex, offset, step.direction);
  const paragraph = text.paragraphs[paragraphIndex] ?? "";
  const matched = cursor.matchedLength;
  const from = {
    start: offset,
    matchedLength:
      matched == null
        ? matched
        : matchedSpanEnd(paragraph, offset, matched) - offset,
  };
  const alongText = { direction: step.direction, unit: step.unit };
  return stepFrom(text, paragraphIndex, from, alongText, matchedLengthAt);
}

/** The first word at or after a place in the text, within the section, or null when none follows. */
export function firstWordFrom(
  text: ChapterText,
  location: ReaderLocation,
): CursorLanding {
  const before = { ...location, offset: location.offset - 1 };
  return stepReaderCursor(text, { location: before }, wordForward, noLookups);
}

/** The last word of the section, as a step backward from its end finds it, or null when it holds no word. */
export function lastWordIn(
  text: ChapterText,
  matchedLengthAt: MatchedLengthAtLocation,
): CursorLanding {
  const paragraphIndex = text.section.end - 1;
  const offset = text.paragraphs[paragraphIndex]?.length ?? 0;
  const past = { chapterIndex: text.chapterIndex, paragraphIndex, offset };
  return stepReaderCursor(
    text,
    { location: past },
    wordBackward,
    matchedLengthAt,
  );
}

/** Steps along one paragraph's text, and on into the neighbouring paragraph when the cursor is at the end. */
function stepFrom(
  text: ChapterText,
  paragraphIndex: number,
  from: { start: number; matchedLength?: number | null },
  step: TextStep,
  matchedLengthAt: MatchedLengthAtLocation,
): CursorLanding {
  const at = (offset: number) => locationIn(text, paragraphIndex, offset);
  const landed = stepTextCursor(
    partsOf(text, paragraphIndex),
    from,
    step,
    (offset) => matchedLengthAt(at(offset)),
  );
  return continueWith(landed, (offset) =>
    offset === from.start
      ? enterNeighbour(text, paragraphIndex, step, matchedLengthAt)
      : at(offset),
  );
}

/** Enters the next or previous paragraph of the section from its near end, passing over paragraphs without words. */
function enterNeighbour(
  text: ChapterText,
  paragraphIndex: number,
  step: TextStep,
  matchedLengthAt: MatchedLengthAtLocation,
): CursorLanding {
  const next = paragraphIndex + (step.direction === "forward" ? 1 : -1);
  if (next < text.section.start || next >= text.section.end) return null;
  const length = text.paragraphs[next]?.length ?? 0;
  const start = step.direction === "forward" ? -1 : length;
  return stepFrom(text, next, { start }, step, matchedLengthAt);
}

/** Moves to the first word of the next or previous sentence, in this paragraph or beyond it. */
function stepSentence(
  text: ChapterText,
  paragraphIndex: number,
  offset: number,
  direction: TextDirection,
): CursorLanding {
  const sentences = sentencesOf(
    text.paragraphs[paragraphIndex] ?? "",
    text.language,
  );
  const current = sentences.findLastIndex(
    (sentence) => sentence.start <= offset,
  );
  if (direction === "forward") {
    const next = sentences[current + 1];
    const landing = next && firstWordIn(text, paragraphIndex, next.start);
    return (
      landing ?? enterNeighbour(text, paragraphIndex, wordForward, noLookups)
    );
  }
  for (let index = current - 1; index >= 0; index--) {
    const landing = firstWordIn(
      text,
      paragraphIndex,
      sentences[index]?.start ?? 0,
    );
    if (landing && landing.offset < offset) return landing;
  }
  return lastSentenceBefore(text, paragraphIndex);
}

/** The first word of the last sentence with a word in the nearest paragraph before the one given, or null when none is in the section. */
function lastSentenceBefore(
  text: ChapterText,
  paragraphIndex: number,
): ReaderLocation | null {
  for (let index = paragraphIndex - 1; index >= text.section.start; index--) {
    const sentences = sentencesOf(text.paragraphs[index] ?? "", text.language);
    const landing = sentences
      .map((sentence) => firstWordIn(text, index, sentence.start))
      .findLast((found) => found !== null);
    if (landing) return landing;
  }
  return null;
}

/** The first word at or after an offset within one paragraph, or null when the paragraph has none there. */
function firstWordIn(
  text: ChapterText,
  paragraphIndex: number,
  offset: number,
): ReaderLocation | null {
  const parts = partsOf(text, paragraphIndex);
  const place = parts
    .flatMap((part) => cursorPlacesIn(part))
    .find((found) => found >= offset);
  return place === undefined ? null : locationIn(text, paragraphIndex, place);
}

/** A word of a paragraph, as `stepTextCursor` takes the parts of a text. */
type TextPart = {
  text: string;
  start: number;
  isWord: true;
  isUnspaced: boolean;
};

/** The words of a paragraph, as the pointer finds them: its stored words, or else those of the language's word boundaries. */
function partsOf(text: ChapterText, paragraphIndex: number): TextPart[] {
  const paragraph = text.paragraphs[paragraphIndex] ?? "";
  const stored = text.storedWords?.[paragraphIndex];
  const words = stored
    ? storedSpansOf(paragraph, stored)
    : wordsOf(paragraph, text.language);
  return words.map((word) => ({
    text: word.text,
    start: word.start,
    isWord: true,
    isUnspaced: !stored && isUnspacedWord(word.text),
  }));
}

/** The offsets in the text where the cursor can lie within one word: its start, or in a run each place a lookup starts from. */
function cursorPlacesIn(part: TextPart): number[] {
  if (!part.isUnspaced) return [part.start];
  return runLookupStarts(part.text).map((offset) => part.start + offset);
}

function locationIn(
  text: ChapterText,
  paragraphIndex: number,
  offset: number,
): ReaderLocation {
  return { chapterIndex: text.chapterIndex, paragraphIndex, offset };
}

/** Continues from a value that may still be awaited, as `stepTextCursor` returns its landing. */
export function continueWith<Given, Next>(
  value: Given | Promise<Given>,
  next: (value: Given) => Next | Promise<Next>,
): Next | Promise<Next> {
  return value instanceof Promise ? value.then(next) : next(value);
}
