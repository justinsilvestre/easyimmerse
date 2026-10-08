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

/**
 * The characters of Line_Break class SA, "Complex Context Dependent (South East Asian)",
 * which Unicode Standard Annex #14 (Unicode Line Breaking Algorithm) assigns to Thai, Lao, Myanmar, Khmer,
 * Tai Le, New Tai Lue, Tai Tham, Myanmar Extended-A and -B, Tai Viet, and Ahom,
 * as `LineBreak.txt` of the Unicode Character Database, version 16.0.0, lists them.
 * These scripts are written without spaces between words.
 * The ranges are written for the inside of a character class of a regular expression with the `u` flag.
 */
export const southEastAsianCharacterRanges = String.raw`\u{E01}-\u{E3A}\u{E40}-\u{E4E}\u{E81}-\u{E82}\u{E84}\u{E86}-\u{E8A}\u{E8C}-\u{EA3}\u{EA5}\u{EA7}-\u{EBD}\u{EC0}-\u{EC4}\u{EC6}\u{EC8}-\u{ECE}\u{EDC}-\u{EDF}\u{1000}-\u{103F}\u{1050}-\u{108F}\u{109A}-\u{109F}\u{1780}-\u{17D3}\u{17D7}\u{17DC}-\u{17DD}\u{1950}-\u{196D}\u{1970}-\u{1974}\u{1980}-\u{19AB}\u{19B0}-\u{19C9}\u{19DE}-\u{19DF}\u{1A20}-\u{1A5E}\u{1A60}-\u{1A7C}\u{1AA0}-\u{1AAD}\u{A9E0}-\u{A9EF}\u{A9FA}-\u{A9FE}\u{AA60}-\u{AAC2}\u{AADB}-\u{AADF}\u{11700}-\u{1171A}\u{1171D}-\u{1172B}\u{1173A}-\u{1173B}\u{1173F}-\u{11746}`;

/**
 * The characters of scripts written without spaces between words:
 * kanji or Chinese characters, kana, and the marks written among them;
 * Bopomofo, which annotates Chinese and has the ideographic Line_Break class ID;
 * and the South East Asian scripts of `southEastAsianCharacterRanges`.
 */
const unspacedPattern = new RegExp(
  String.raw`^[㐀-䶿一-鿿豈-﫿\u{20000}-\u{3134F}々-〇぀-ヿ\u{3105}-\u{312F}\u{31A0}-\u{31BF}ㇰ-ㇿｦ-ﾟ${southEastAsianCharacterRanges}]$`,
  "u",
);

/**
 * The combining marks of the Line_Break class SA scripts, such as Thai vowel signs and tone marks:
 * the SA characters whose General_Category is Mn or Mc in `LineBreak.txt`, version 16.0.0.
 * A mark belongs to the letter before it, so no word begins with one.
 */
const unspacedMarkPattern =
  /^[\u{E31}\u{E34}-\u{E3A}\u{E47}-\u{E4E}\u{EB1}\u{EB4}-\u{EBC}\u{EC8}-\u{ECE}\u{102B}-\u{103E}\u{1056}-\u{1059}\u{105E}-\u{1060}\u{1062}-\u{1064}\u{1067}-\u{106D}\u{1071}-\u{1074}\u{1082}-\u{108D}\u{108F}\u{109A}-\u{109D}\u{17B4}-\u{17D3}\u{17DD}\u{1A55}-\u{1A5E}\u{1A60}-\u{1A7C}\u{A9E5}\u{AA7B}-\u{AA7D}\u{AAB0}\u{AAB2}-\u{AAB4}\u{AAB7}-\u{AAB8}\u{AABE}-\u{AABF}\u{AAC1}\u{1171D}-\u{1172B}]$/u;

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
