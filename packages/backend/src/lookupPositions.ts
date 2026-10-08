/**
 * Lists the positions of a text, counted in characters (Unicode scalar values), at which a batch lookup looks words up.
 * In text that separates its words with spaces these are the starts of words; in Japanese and Chinese, every character.
 * Whitespace and punctuation are never positions.
 * This mirrors `lookup_positions` in `crates/core/src/lookup/lookup_positions.rs`, which decides what a batch covers.
 */
export function lookupPositions(text: string): number[] {
  const positions: number[] = [];
  let previous: string | null = null;
  for (const [position, character] of [...text].entries()) {
    if (!isWordBoundary(character) && mayStartWord(previous, character))
      positions.push(position);
    previous = character;
  }
  return positions;
}

function mayStartWord(previous: string | null, character: string): boolean {
  return (
    previous === null ||
    isWordBoundary(previous) ||
    isUnspaced(previous) ||
    isUnspaced(character)
  );
}

/** Kanji or Chinese characters, kana, and the marks written among them. */
const unspacedPattern =
  /^[㐀-䶿一-鿿豈-﫿\u{20000}-\u{3134F}々-〇぀-ヿㇰ-ㇿｦ-ﾟ]$/u;

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
