/** A span of text within a paragraph. */
export type TextSpan = { text: string; start: number; end: number };

/**
 * Finds the word that contains the character at the offset, using the language's word boundaries,
 * so that languages written without spaces, such as Japanese, are split too.
 * Returns null when the character is punctuation or space.
 */
export function wordAt(
  text: string,
  offset: number,
  language: string,
): TextSpan | null {
  const segment = segmenterOf(language, "word")
    .segment(text)
    .containing(offset);
  if (!segment?.isWordLike) return null;
  return spanOf(segment);
}

/**
 * Finds the words beside a caret at the offset: the one after it first, then the one before it.
 * A caret lies between characters, so the character under the pointer may be on either side of it,
 * and in text without spaces both sides can belong to words.
 */
export function wordsAroundCaret(
  text: string,
  offset: number,
  language: string,
): TextSpan[] {
  const after = wordAt(text, offset, language);
  const before = offset > 0 ? wordAt(text, offset - 1, language) : null;
  if (before === null || before.start === after?.start)
    return after ? [after] : [];
  return after ? [after, before] : [before];
}

/** Finds the sentence that contains the character at the offset. */
export function sentenceAt(
  text: string,
  offset: number,
  language: string,
): TextSpan | null {
  const segment = segmenterOf(language, "sentence")
    .segment(text)
    .containing(offset);
  if (!segment) return null;
  const span = spanOf(segment);
  const trimmed = span.text.trimEnd();
  return { ...span, text: trimmed, end: span.start + trimmed.length };
}

function spanOf(segment: Intl.SegmentData): TextSpan {
  return {
    text: segment.segment,
    start: segment.index,
    end: segment.index + segment.segment.length,
  };
}

type Granularity = "word" | "sentence";

const segmenters = new Map<string, Intl.Segmenter>();

/** Reuses one segmenter per language, since the pointer asks for words on every move. */
function segmenterOf(language: string, granularity: Granularity) {
  const key = `${language} ${granularity}`;
  const cached = segmenters.get(key);
  if (cached) return cached;
  const segmenter = createSegmenter(language, granularity);
  segmenters.set(key, segmenter);
  return segmenter;
}

/** Falls back to the default locale for a malformed language tag, which a book's metadata may hold. */
function createSegmenter(language: string, granularity: Granularity) {
  try {
    return new Intl.Segmenter(language, { granularity });
  } catch {
    return new Intl.Segmenter(undefined, { granularity });
  }
}
