import type { Document } from "@easyimmerse/types";

/** Where a search query occurs in a document. `start` and `end` are offsets within the paragraph. */
export type SearchMatch = {
  chapterIndex: number;
  paragraphIndex: number;
  start: number;
  end: number;
};

/** The characters of context shown on either side of a match in the results list. */
const contextLength = 40;

/**
 * Finds every occurrence of the query in the document, ignoring case and accents, so that "uber" finds "Über".
 * Stops after `limit` matches.
 */
export function searchDocument(
  document: Document,
  query: string,
  limit = 500,
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  for (const [chapterIndex, chapter] of document.chapters.entries()) {
    for (const [paragraphIndex, paragraph] of chapter.paragraphs.entries()) {
      for (const range of findMatchRanges(paragraph, query)) {
        matches.push({ chapterIndex, paragraphIndex, ...range });
        if (matches.length >= limit) return matches;
      }
    }
  }
  return matches;
}

/** Finds the ranges of the text that match the query, ignoring case and accents. */
export function findMatchRanges(
  text: string,
  query: string,
): { start: number; end: number }[] {
  const needle = foldText(query.trim()).folded;
  if (needle.length === 0) return [];
  const haystack = foldText(text);
  const ranges: { start: number; end: number }[] = [];
  let from = haystack.folded.indexOf(needle);
  while (from !== -1) {
    const last = from + needle.length - 1;
    ranges.push({
      start: haystack.sourceIndexes[from] ?? 0,
      end: (haystack.sourceIndexes[last] ?? 0) + 1,
    });
    from = haystack.folded.indexOf(needle, from + needle.length);
  }
  return ranges;
}

/** Cuts the text around a match down to a short excerpt for the results list. */
export function excerptAround(text: string, start: number, end: number) {
  const from = Math.max(0, start - contextLength);
  const to = Math.min(text.length, end + contextLength);
  return {
    before: (from > 0 ? "…" : "") + text.slice(from, start).trimStart(),
    match: text.slice(start, end),
    after: text.slice(end, to).trimEnd() + (to < text.length ? "…" : ""),
  };
}

/**
 * Lowercases the text and strips its accents and zero-width spaces,
 * keeping for each folded character the index of the source character it came from.
 */
function foldText(text: string) {
  let folded = "";
  const sourceIndexes: number[] = [];
  for (let index = 0; index < text.length; index++) {
    const piece = text[index]
      ?.normalize("NFD")
      .replace(/[\p{M}\u200B]/gu, "")
      .toLowerCase();
    for (const character of piece ?? "") {
      folded += character;
      sourceIndexes.push(index);
    }
  }
  return { folded, sourceIndexes };
}
