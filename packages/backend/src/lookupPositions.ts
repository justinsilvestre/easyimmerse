import {
  chineseAndJapaneseCharacterRanges,
  southEastAsianCharacterRanges,
  southEastAsianMarkRanges,
} from "@easyimmerse/types";

/**
 * Lists the positions of a text, counted in characters (Unicode scalar values), at which a batch lookup looks words up.
 * In text that separates its words with spaces these are the starts of words.
 * In scripts that do not, such as Japanese, Chinese, and Thai, every character is a position,
 * except a combining mark such as a Thai vowel sign, which belongs to the letter before it.
 * Whitespace and punctuation are never positions.
 * This mirrors `lookup_positions` in `crates/core/src/lookup/lookup_positions.rs`, which decides what a batch covers.
 */
export function lookupPositions(text: string): number[] {
  const positions: number[] = [];
  let previous: string | null = null;
  for (const [position, character] of [...text].entries()) {
    if (
      !isWordBoundary(character) &&
      !isUnspacedMark(character) &&
      mayStartWord(previous, character)
    )
      positions.push(position);
    previous = character;
  }
  return positions;
}

/** Lists the same positions as `lookupPositions`, as offsets in UTF-16 code units, which JavaScript string indices count. */
export function lookupStartsIn(text: string): number[] {
  const offsets: number[] = [];
  let offset = 0;
  for (const character of text) {
    offsets.push(offset);
    offset += character.length;
  }
  return lookupPositions(text).map((position) => offsets[position] ?? 0);
}

function mayStartWord(previous: string | null, character: string): boolean {
  return (
    previous === null ||
    isWordBoundary(previous) ||
    isUnspaced(previous) ||
    isUnspaced(character)
  );
}

const unspacedPattern = new RegExp(
  `^[${chineseAndJapaneseCharacterRanges}${southEastAsianCharacterRanges}]$`,
  "u",
);

const unspacedMarkPattern = new RegExp(`^[${southEastAsianMarkRanges}]$`, "u");

function isUnspacedMark(character: string): boolean {
  return unspacedMarkPattern.test(character);
}

function isUnspaced(character: string): boolean {
  return unspacedPattern.test(character);
}

/** Apostrophes and hyphens stay inside words, since headwords such as don't and well-known contain them. */
const keptInWords = /^['\-‐‑’]$/u;

const punctuationPattern =
  /^[!-/:-@[-`{-~¡«·»¿ -⁯、-〃〈-】〔-〟〰〽・！-／：-＠［-｀｛-･]$/u;

function isWordBoundary(character: string): boolean {
  if (keptInWords.test(character)) return false;
  return (
    /^\p{White_Space}$/u.test(character) || punctuationPattern.test(character)
  );
}
