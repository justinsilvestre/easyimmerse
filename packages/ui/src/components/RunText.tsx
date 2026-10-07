import clsx from "clsx";
import { characterLength } from "./useKeyboardStart.ts";

/** A stretch of text, in UTF-16 code units from its start. */
export type Range = { from: number; to: number };

/**
 * The text of a run written without spaces, or of a word that holds a word a flashcard was made from.
 * The characters a lookup matched are highlighted,
 * as are the character under the mouse or the text a lookup from it matched.
 * While the run has keyboard focus, the character a lookup from the keyboard would start from is marked.
 * The words that flashcards were made from are underlined.
 */
export function RunText({
  text,
  matched,
  hovered = null,
  keyboardStart,
  flashcardWords = [],
}: {
  text: string;
  matched: Range | null;
  hovered?: Range | null;
  keyboardStart: number | null;
  flashcardWords?: readonly Range[];
}) {
  const marked =
    keyboardStart === null
      ? null
      : {
          from: keyboardStart,
          to: keyboardStart + characterLength(text, keyboardStart),
        };
  return (
    <>
      {piecesOf(text, [matched, hovered, marked, ...flashcardWords]).map(
        ({ from, to }) => {
          const isFlashcardWord = flashcardWords.some((range) =>
            isWithin(from, range),
          );
          return (
            <span
              key={from}
              data-matched={isWithin(from, matched) || undefined}
              data-hovered={isWithin(from, hovered) || undefined}
              data-keyboard-start={isWithin(from, marked) || undefined}
              data-flashcard-word={isFlashcardWord || undefined}
              className={clsx(
                (isWithin(from, matched) || isWithin(from, hovered)) &&
                  "rounded-sm bg-accent-soft text-accent-fg",
                isFlashcardWord && flashcardWordClassName,
                isWithin(from, marked) &&
                  "underline decoration-solid decoration-2 underline-offset-4",
              )}
            >
              {text.slice(from, to)}
            </span>
          );
        },
      )}
    </>
  );
}

/** The underline of a word that a flashcard was made from. */
const flashcardWordClassName =
  "underline decoration-accent decoration-dotted decoration-2 underline-offset-4";

function isWithin(offset: number, range: Range | null): boolean {
  return range !== null && offset >= range.from && offset < range.to;
}

/** Cuts the text at the edges of the ranges, so that each piece lies wholly inside or outside each range. */
function piecesOf(text: string, ranges: readonly (Range | null)[]): Range[] {
  const cuts = new Set([0, text.length]);
  for (const range of ranges)
    if (range) for (const edge of [range.from, range.to]) cuts.add(edge);
  const sorted = [...cuts]
    .filter((cut) => cut <= text.length)
    .sort((a, b) => a - b);
  return sorted
    .slice(0, -1)
    .map((from, index) => ({ from, to: sorted[index + 1] ?? from }));
}
