import type { Document, TextSpan, TranslationLink } from "@easyimmerse/types";
import { clampSpanToDocument } from "./alignment/textSpans.ts";
import { translationSpansOf } from "./alignment/translationAlignment.ts";

/**
 * The spans of the shown text to highlight while the book's audio speaks `spoken`, in document order:
 * the spoken span itself where the book is shown, or where the translation is shown in its stead,
 * the translation that its links pair with it, which is nothing when the translation is not aligned.
 * Spans that no longer fit the shown text are left out.
 */
export function spokenSpansShown(
  spoken: TextSpan | null,
  shownDocument: Document,
  translationLinks: readonly TranslationLink[] | null,
): TextSpan[] {
  if (spoken === null) return [];
  const spans =
    translationLinks === null
      ? [spoken]
      : translationSpansOf(translationLinks, spoken);
  return spans.flatMap(
    (span) => clampSpanToDocument(span, shownDocument) ?? [],
  );
}
