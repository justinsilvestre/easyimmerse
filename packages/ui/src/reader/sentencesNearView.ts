import type { ReaderLocation } from "./readingProgress.ts";
import { zeroWidthSpace } from "./unwrapHardLineBreaks.ts";
import { sentencesOf } from "./wordAt.ts";

/** The most characters a sentence may hold to be looked up ahead, which is what one text of a batch lookup may hold. */
const maxSentenceCharacters = 2000;

/** A stretch of a paragraph, from `start` up to `end`, in UTF-16 code units. */
type TextWindow = { paragraph: string; start: number; end: number };

/**
 * The sentences of a chapter whose words to look up ahead of the reader, most urgent first, as `sentenceLookupAt` sends them:
 * those of the text from the place in view on for two screens, then, going back, those of the screen before it.
 * `screenCharacters` is about how much text one screen shows. Sentences too long for a batch lookup are left out.
 */
export function sentencesNearView(
  paragraphs: readonly string[],
  place: Pick<ReaderLocation, "paragraphIndex" | "offset">,
  language: string,
  screenCharacters: number,
): string[] {
  const windows = [
    ...windowsAhead(paragraphs, place, 2 * screenCharacters),
    ...windowsBehind(paragraphs, place, screenCharacters),
  ];
  return [
    ...new Set(windows.flatMap((window) => sentencesIn(window, language))),
  ];
}

function windowsAhead(
  paragraphs: readonly string[],
  { paragraphIndex, offset }: Pick<ReaderLocation, "paragraphIndex" | "offset">,
  characters: number,
): TextWindow[] {
  const windows: TextWindow[] = [];
  let remaining = characters;
  let start = offset;
  for (const paragraph of paragraphs.slice(paragraphIndex)) {
    if (remaining <= 0) break;
    const end = Math.min(paragraph.length, start + remaining);
    if (end > start) windows.push({ paragraph, start, end });
    remaining -= end - start;
    start = 0;
  }
  return windows;
}

function windowsBehind(
  paragraphs: readonly string[],
  { paragraphIndex, offset }: Pick<ReaderLocation, "paragraphIndex" | "offset">,
  characters: number,
): TextWindow[] {
  const windows: TextWindow[] = [];
  let remaining = characters;
  let end: number | null = offset;
  for (let index = paragraphIndex; index >= 0 && remaining > 0; index--) {
    const paragraph = paragraphs[index] ?? "";
    const windowEnd = end ?? paragraph.length;
    const start = Math.max(0, windowEnd - remaining);
    if (windowEnd > start) windows.push({ paragraph, start, end: windowEnd });
    remaining -= windowEnd - start;
    end = null;
  }
  return windows;
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
