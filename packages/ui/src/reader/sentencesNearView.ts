import type { ItemSpan } from "@easyimmerse/state";
import type { ReaderLocation } from "./readingProgress.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";
import { sentencesOf } from "./wordAt.ts";

/** The most characters a sentence may hold to be looked up ahead, which is what one text of a batch lookup may hold. */
const maxSentenceCharacters = 2000;

/**
 * The most text of one paragraph that is looked up ahead of the place in view, and half that behind it.
 * Paragraphs near the view are taken whole up to this, so that one paragraph many screens long, as in a plain-text book, stays cheap.
 */
const paragraphCharacters = 4000;

/** A stretch of a paragraph, from `start` up to `end`, in UTF-16 code units. */
type TextWindow = { paragraph: string; start: number; end: number };

type Place = Pick<ReaderLocation, "paragraphIndex" | "offset">;

/**
 * The sentences of a chapter whose words to look up ahead of the reader, most urgent first, as `sentenceLookupAt` sends them:
 * those of the paragraphs `near` the view, by their indexes, from the place in view on, then those before it.
 * The paragraph of the place in view is always taken. Of a long paragraph, only the text within `paragraphCharacters`
 * of the place in view, or of the end that faces it, is taken. Sentences too long for a batch lookup are left out.
 */
export function sentencesNearView(
  paragraphs: readonly string[],
  near: ItemSpan,
  place: Place,
  language: string,
): string[] {
  const first = Math.min(near.first, place.paragraphIndex);
  const last = Math.min(
    Math.max(near.last, place.paragraphIndex),
    paragraphs.length - 1,
  );
  const indexes = [
    ...range(place.paragraphIndex, last + 1),
    ...range(first, place.paragraphIndex).reverse(),
  ];
  const windows = indexes.map((index) =>
    windowOf(paragraphs[index] ?? "", index, place),
  );
  return [
    ...new Set(windows.flatMap((window) => sentencesIn(window, language))),
  ];
}

/** The text of a paragraph to look up ahead: near the place in view in its own paragraph, and near the end facing it in others. */
function windowOf(paragraph: string, index: number, place: Place): TextWindow {
  const { length } = paragraph;
  if (index > place.paragraphIndex)
    return { paragraph, start: 0, end: Math.min(length, paragraphCharacters) };
  if (index < place.paragraphIndex)
    return {
      paragraph,
      start: Math.max(0, length - paragraphCharacters / 2),
      end: length,
    };
  return {
    paragraph,
    start: Math.max(0, place.offset - paragraphCharacters / 2),
    end: Math.min(length, place.offset + paragraphCharacters),
  };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);
}

/**
 * The sentences that overlap a window, found by segmenting only the text around it.
 * The text taken reaches past the window by the longest sentence kept, so that every sentence kept is whole;
 * a sentence cut off at either end of that text is longer than that and is left out.
 */
function sentencesIn(window: TextWindow, language: string): string[] {
  const { paragraph, start, end } = window;
  const from = Math.max(0, start - maxSentenceCharacters);
  const to = Math.min(paragraph.length, end + maxSentenceCharacters);
  const spans = sentencesOf(paragraph.slice(from, to), language);
  return spans
    .filter((span, index) => {
      const isCut =
        (from > 0 && index === 0) ||
        (to < paragraph.length && index === spans.length - 1);
      return !isCut && from + span.start < end && from + span.end > start;
    })
    .map((span) => span.text.replaceAll(zeroWidthSpace, ""))
    .filter((text) => text !== "" && [...text].length <= maxSentenceCharacters);
}
