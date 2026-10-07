import { characterLength } from "./characterLength.ts";
import type { TextDirection, TextStep } from "./cursorKeys.ts";
import type { TextCursor } from "./textCursor.ts";

/** A part of a text, as `splitIntoWords` finds it. */
type TextPart = {
  text: string;
  start: number;
  isWord: boolean;
  isUnspaced: boolean;
};

/**
 * Looks up the text from an offset and resolves to the length of the text the lookup matched, or null when it matched nothing;
 * or returns null at once when the text is not looked up.
 */
export type MatchedLengthAt = (offset: number) => Promise<number | null> | null;

/**
 * Where the lookup cursor lands after one step along the text.
 * A step by character moves to the next or previous character of a run written without spaces, or word written with spaces.
 * A step by word moves the same way in a language written with spaces. In a run written without spaces, it moves forward past the text
 * the lookup from the cursor matched, or by a character while that lookup has not answered or matched nothing;
 * and backward to the start of the word before the cursor, as lookups from the run's start cut the run into words,
 * so that the landing then comes as a promise.
 * Punctuation and spaces hold no place, and at either end of the text the cursor stays.
 */
export function stepTextCursor(
  parts: readonly TextPart[],
  cursor: Pick<TextCursor, "start" | "matchedLength">,
  step: TextStep,
  matchedLengthAt: MatchedLengthAt,
): number | Promise<number> {
  const places = parts.flatMap(cursorPlacesIn);
  if (step.unit === "character")
    return stepToPlace(places, cursor.start, step.direction);
  if (step.direction === "forward")
    return (
      places.find((place) => place >= wordEndOf(parts, cursor)) ?? cursor.start
    );
  const previous = stepToPlace(places, cursor.start, "backward");
  const run = parts.find((part) => part.isUnspaced && contains(part, previous));
  if (previous === cursor.start || !run) return previous;
  return wordStartInRun(run, previous, matchedLengthAt);
}

function stepToPlace(
  places: readonly number[],
  offset: number,
  direction: TextDirection,
): number {
  const landing =
    direction === "forward"
      ? places.find((place) => place > offset)
      : places.findLast((place) => place < offset);
  return landing ?? offset;
}

/** Where the word at the cursor ends: past the text its lookup matched in a run written without spaces, and just after the cursor otherwise. */
function wordEndOf(
  parts: readonly TextPart[],
  cursor: Pick<TextCursor, "start" | "matchedLength">,
): number {
  const isInRun = parts.some(
    (part) => part.isUnspaced && contains(part, cursor.start),
  );
  return cursor.start + ((isInRun && cursor.matchedLength) || 1);
}

/**
 * The start of the word that holds `offset` when a run is cut into words from its start, each as long as the lookup from it matched,
 * as stepping forward word by word from the run's start would cut it. Where nothing is looked up or matched, a word is one character.
 */
function wordStartInRun(
  run: TextPart,
  offset: number,
  matchedLengthAt: MatchedLengthAt,
): number | Promise<number> {
  const first = matchedLengthAt(run.start);
  if (first === null) return offset;
  const cut = async (
    start: number,
    answer: ReturnType<MatchedLengthAt>,
  ): Promise<number> => {
    const length =
      (await answer) || characterLength(run.text, start - run.start);
    const end = start + length;
    return end > offset ? start : cut(end, matchedLengthAt(end));
  };
  return cut(run.start, first);
}

/** The offsets in the text where the cursor can lie within one part of it. */
function cursorPlacesIn(part: TextPart): number[] {
  if (!part.isWord) return [];
  if (!part.isUnspaced) return [part.start];
  const places: number[] = [];
  for (
    let offset = 0;
    offset < part.text.length;
    offset += characterLength(part.text, offset)
  )
    places.push(part.start + offset);
  return places;
}

function contains(part: TextPart, offset: number): boolean {
  return offset >= part.start && offset < part.start + part.text.length;
}
