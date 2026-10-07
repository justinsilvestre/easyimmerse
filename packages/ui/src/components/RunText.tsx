import clsx from "clsx";
import { characterLength } from "./useKeyboardStart.ts";

/** A stretch of a run, in UTF-16 code units from its start. */
export type Range = { from: number; to: number };

/**
 * The text of a run written without spaces, with the characters a lookup matched highlighted,
 * the character under the mouse, or the text a lookup from it matched, highlighted the same way,
 * and, while the run has keyboard focus, the character a lookup from the keyboard would start from marked.
 */
export function RunText({
  text,
  matched,
  hovered = null,
  keyboardStart,
}: {
  text: string;
  matched: Range | null;
  hovered?: Range | null;
  keyboardStart: number | null;
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
      {piecesOf(text, [matched, hovered, marked]).map(({ from, to }) => (
        <span
          key={from}
          data-matched={isWithin(from, matched) || undefined}
          data-hovered={isWithin(from, hovered) || undefined}
          data-keyboard-start={isWithin(from, marked) || undefined}
          className={clsx(
            (isWithin(from, matched) || isWithin(from, hovered)) &&
              "rounded-sm bg-accent-soft text-accent-fg",
            isWithin(from, marked) &&
              "underline decoration-2 underline-offset-4",
          )}
        >
          {text.slice(from, to)}
        </span>
      ))}
    </>
  );
}

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
