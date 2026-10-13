import type { ReaderLocation } from "@easyimmerse/state";
import type { Document, TextSpan, TranslationLink } from "@easyimmerse/types";
import {
  compareSpans,
  isInParagraph,
  type ParagraphAddress,
  spanContains,
  spansOfParagraph,
  textOfSpans,
} from "./textSpans.ts";

/** The link one of whose document spans holds the location, or null when no link covers it. */
export function linkAt(
  links: readonly TranslationLink[],
  location: ReaderLocation,
): TranslationLink | null {
  return (
    links.find(({ spans }) =>
      spans.some((span) => spanContains(span, location)),
    ) ?? null
  );
}

/** The links with a document span in the given paragraph, ordered by their first span there. */
export function linksOfParagraph(
  links: readonly TranslationLink[],
  chapterIndex: number,
  paragraphIndex: number,
): TranslationLink[] {
  return links
    .flatMap((link) => {
      const [first] = spansOfParagraph(
        link.spans,
        chapterIndex,
        paragraphIndex,
      );
      return first === undefined ? [] : [{ link, first }];
    })
    .sort((a, b) => compareSpans(a.first, b.first))
    .map(({ link }) => link);
}

/** The text of the translation document that a link pairs with its document text. */
export function translationOfLink(
  translationDocument: Document,
  link: TranslationLink,
): string {
  return textOfSpans(translationDocument, link.translation_spans);
}

/** The translation spans of the links with a document span that shares text with the given span, in their document order. */
export function translationSpansOf(
  links: readonly TranslationLink[],
  span: TextSpan,
): TextSpan[] {
  return links
    .filter(({ spans }) => spans.some((linked) => spansOverlap(linked, span)))
    .flatMap(({ translation_spans }) => translation_spans)
    .sort(compareSpans);
}

function spansOverlap(a: TextSpan, b: TextSpan): boolean {
  return (
    isInParagraph(a, b.chapter_index, b.paragraph_index) &&
    a.start < b.end &&
    b.start < a.end
  );
}

/** The distinct paragraphs of the translation document linked from the given paragraph, in their document order. */
export function translationParagraphsOf(
  links: readonly TranslationLink[],
  chapterIndex: number,
  paragraphIndex: number,
): ParagraphAddress[] {
  const translationSpans = links
    .filter(({ spans }) =>
      spans.some((span) => isInParagraph(span, chapterIndex, paragraphIndex)),
    )
    .flatMap(({ translation_spans }) => translation_spans)
    .sort(compareSpans);
  const paragraphs: ParagraphAddress[] = [];
  for (const span of translationSpans) {
    const last = paragraphs.at(-1);
    if (
      last?.chapterIndex !== span.chapter_index ||
      last.paragraphIndex !== span.paragraph_index
    )
      paragraphs.push({
        chapterIndex: span.chapter_index,
        paragraphIndex: span.paragraph_index,
      });
  }
  return paragraphs;
}
