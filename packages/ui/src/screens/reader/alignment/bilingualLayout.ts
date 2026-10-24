import type { Document, TextSpan, TranslationLink } from "@easyimmerse/types";
import {
  clampSpanToDocument,
  compareSpans,
  isInParagraph,
  type ParagraphAddress,
} from "./textSpans.ts";
import {
  linksOfParagraph,
  translationOfLink,
  translationParagraphsOf,
} from "./translationAlignment.ts";

/** A translation the interlinear view shows inside a paragraph, after the passage of the paragraph that ends at `at`. */
export type InterlinearLine = { at: number; text: string };

/**
 * The translations the interlinear view shows in a paragraph, in the order of the passages they follow.
 * Each link's translation follows the last of its document spans, so a passage that runs on into the next paragraph is translated there.
 * A link whose translation is empty, for text the translation leaves out, shows nothing,
 * and neither does one whose last span's quote no longer matches the book's text.
 */
export function interlinearLinesOf(
  links: readonly TranslationLink[],
  document: Document,
  translationDocument: Document,
  chapterIndex: number,
  paragraphIndex: number,
): InterlinearLine[] {
  return linksOfParagraph(links, chapterIndex, paragraphIndex).flatMap(
    (link) => {
      const last = lastSpanOf(link.spans);
      const fitted =
        last && isInParagraph(last, chapterIndex, paragraphIndex)
          ? clampSpanToDocument(last, document)
          : null;
      const text = translationOfLink(translationDocument, link);
      return fitted && text ? [{ at: fitted.end, text }] : [];
    },
  );
}

function lastSpanOf(spans: readonly TextSpan[]): TextSpan | undefined {
  return [...spans].sort(compareSpans).at(-1);
}

/** The paragraphs of the translation the bilingual views show beside each chapter title and each paragraph of the book. */
export type ParallelRows = {
  besideTitle: (chapterIndex: number) => readonly ParagraphAddress[];
  besideParagraph: (
    chapterIndex: number,
    paragraphIndex: number,
  ) => readonly ParagraphAddress[];
};

/**
 * Pairs each paragraph of the book with the paragraphs of the translation linked from it, for the parallel view.
 * A translation paragraph linked from several paragraphs of the book stands beside the first of them only.
 * A translation paragraph that no link reaches stands in its order before the next linked one,
 * or after the last linked one at the end, so that every paragraph of the translation is shown once, in its order.
 * Those that come before the first linked paragraph of a chapter with a title, such as the translated title, stand beside the title instead.
 */
export function parallelRowsOf(
  links: readonly TranslationLink[],
  document: Document,
  translationDocument: Document,
): ParallelRows {
  const byParagraph = linksByParagraph(links);
  const owners = new Map<string, ParagraphAddress>();
  for (const owner of paragraphsOf(document)) {
    const { chapterIndex, paragraphIndex } = owner;
    const nearLinks = byParagraph.get(keyOf(owner)) ?? [];
    for (const translated of translationParagraphsOf(
      nearLinks,
      chapterIndex,
      paragraphIndex,
    )) {
      const key = keyOf(translated);
      if (!owners.has(key)) owners.set(key, owner);
    }
  }
  const rows = new Map<string, ParagraphAddress[]>();
  const add = (row: string, paragraphs: ParagraphAddress[]) =>
    rows.set(row, [...(rows.get(row) ?? []), ...paragraphs]);
  let unlinked: ParagraphAddress[] = [];
  let lastOwner: ParagraphAddress | null = null;
  for (const translated of paragraphsOf(translationDocument)) {
    const owner = owners.get(keyOf(translated));
    if (owner === undefined) {
      unlinked.push(translated);
      continue;
    }
    const opensChapter = lastOwner?.chapterIndex !== owner.chapterIndex;
    const hasTitle = Boolean(document.chapters[owner.chapterIndex]?.title);
    if (opensChapter && hasTitle) {
      add(titleKeyOf(owner.chapterIndex), unlinked);
      add(keyOf(owner), [translated]);
    } else add(keyOf(owner), [...unlinked, translated]);
    unlinked = [];
    lastOwner = owner;
  }
  if (unlinked.length > 0)
    add(keyOf(lastOwner ?? { chapterIndex: 0, paragraphIndex: 0 }), unlinked);
  return {
    besideTitle: (chapterIndex) => rows.get(titleKeyOf(chapterIndex)) ?? [],
    besideParagraph: (chapterIndex, paragraphIndex) =>
      rows.get(keyOf({ chapterIndex, paragraphIndex })) ?? [],
  };
}

/**
 * The links grouped under each paragraph of the book that one of their spans lies in,
 * so that each paragraph's translation is looked for among a few links rather than all of a long book's.
 */
function linksByParagraph(
  links: readonly TranslationLink[],
): Map<string, TranslationLink[]> {
  const index = new Map<string, TranslationLink[]>();
  for (const link of links) {
    const keys = link.spans.map((span) =>
      keyOf({
        chapterIndex: span.chapter_index,
        paragraphIndex: span.paragraph_index,
      }),
    );
    for (const key of new Set(keys)) {
      const grouped = index.get(key);
      if (grouped) grouped.push(link);
      else index.set(key, [link]);
    }
  }
  return index;
}

function* paragraphsOf(document: Document): Generator<ParagraphAddress> {
  for (const [chapterIndex, chapter] of document.chapters.entries())
    for (const paragraphIndex of chapter.paragraphs.keys())
      yield { chapterIndex, paragraphIndex };
}

function keyOf({ chapterIndex, paragraphIndex }: ParagraphAddress): string {
  return `${chapterIndex}:${paragraphIndex}`;
}

function titleKeyOf(chapterIndex: number): string {
  return `${chapterIndex}:title`;
}
