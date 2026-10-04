/** A span of text within a paragraph. */
export type TextSpan = { text: string; start: number; end: number };

/**
 * Finds the word that contains the character at the offset, using the language's word
 * boundaries, so that languages written without spaces, such as Japanese, are split too.
 * Returns null when the character is punctuation or space.
 */
export function wordAt(
  text: string,
  offset: number,
  language: string,
): TextSpan | null {
  const segment = new Intl.Segmenter(language, { granularity: "word" })
    .segment(text)
    .containing(offset);
  if (!segment?.isWordLike) return null;
  return spanOf(segment);
}

/** Finds the sentence that contains the character at the offset. */
export function sentenceAt(
  text: string,
  offset: number,
  language: string,
): TextSpan | null {
  const segment = new Intl.Segmenter(language, { granularity: "sentence" })
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
