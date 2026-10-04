/** A run of a term's text, with the reading to show over it if it has one. */
export type FuriganaPart = { text: string; ruby: string | null };

const kanjiRunPattern = /((?:\p{Script=Han}|[々〆ヶ])+)/u;

/**
 * Splits a reading over the kanji of a term, so that kana in the term stand bare and only the kanji carry furigana.
 * Falls back to the whole reading over the whole term when the kana of the term cannot be found in the reading.
 */
export function distributeFurigana(
  term: string,
  reading: string | null,
): FuriganaPart[] {
  if (!reading || reading === term || !kanjiRunPattern.test(term))
    return [{ text: term, ruby: null }];
  const segments = term.split(kanjiRunPattern).filter(Boolean);
  const match = toHiragana(reading).match(readingPattern(segments));
  if (!match) return [{ text: term, ruby: reading }];
  let offset = 0;
  return segments.map((text, index) => {
    const length = match[index + 1]?.length ?? 0;
    const ruby = reading.slice(offset, offset + length);
    offset += length;
    return { text, ruby: isKanjiRun(text) ? ruby : null };
  });
}

function readingPattern(segments: readonly string[]): RegExp {
  const groups = segments.map((segment) =>
    isKanjiRun(segment) ? "(.+?)" : `(${escapeRegExp(toHiragana(segment))})`,
  );
  return new RegExp(`^${groups.join("")}$`, "u");
}

function isKanjiRun(segment: string): boolean {
  return new RegExp(`^${kanjiRunPattern.source}$`, "u").test(segment);
}

function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (katakana) =>
    String.fromCharCode(katakana.charCodeAt(0) - 0x60),
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
