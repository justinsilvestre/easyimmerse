import type { PageInfo } from "./PagedChapter.tsx";

/**
 * A run of consecutive paragraphs in a chapter, from `start` up to but not including `end`.
 * The paged layout shows one section at a time, so that a long chapter is never laid out whole.
 */
export type ChapterSection = { start: number; end: number };

/** The page within a whole chapter, which is estimated when the chapter has several sections. */
export type ChapterPage = PageInfo & { isEstimate: boolean };

/**
 * Divides a chapter's paragraphs into sections of at most `maxCharacters`, breaking only
 * between paragraphs. The sections are kept close to one size, which steadies the page
 * estimate across them. A paragraph longer than the limit gets a section of its own.
 */
export function sectionsOf(
  paragraphs: readonly string[],
  maxCharacters: number,
): ChapterSection[] {
  const total = paragraphs.reduce(
    (sum, paragraph) => sum + paragraph.length,
    0,
  );
  const targetLength = total / Math.max(1, Math.ceil(total / maxCharacters));
  const sections: ChapterSection[] = [{ start: 0, end: 0 }];
  let before = 0;
  let length = 0;
  for (const [index, paragraph] of paragraphs.entries()) {
    const current = sections[sections.length - 1] as ChapterSection;
    const isFull =
      current.end > current.start &&
      (length + paragraph.length > maxCharacters ||
        before >= sections.length * targetLength);
    if (isFull) {
      sections.push({ start: index, end: index + 1 });
      length = paragraph.length;
    } else {
      current.end = index + 1;
      length += paragraph.length;
    }
    before += paragraph.length;
  }
  return sections;
}

/** The index of the section holding the paragraph, or of the last section for a paragraph past the end. */
export function sectionIndexAt(
  sections: readonly ChapterSection[],
  paragraphIndex: number,
): number {
  const index = sections.findIndex((section) => paragraphIndex < section.end);
  return index === -1 ? sections.length - 1 : index;
}

/**
 * Converts a page within a section to a page within the whole chapter, assuming every
 * section fills as many pages per character as the one on screen.
 */
export function estimateChapterPage(
  sectionPage: PageInfo,
  paragraphs: readonly string[],
  sections: readonly ChapterSection[],
  sectionIndex: number,
): ChapterPage {
  const section = sections[sectionIndex];
  if (sections.length === 1 || !section)
    return { ...sectionPage, isEstimate: false };
  const pagesPerCharacter =
    sectionPage.pageCount /
    Math.max(1, lengthOf(paragraphs.slice(section.start, section.end)));
  const page =
    Math.round(
      lengthOf(paragraphs.slice(0, section.start)) * pagesPerCharacter,
    ) + sectionPage.page;
  const pageCount = Math.round(lengthOf(paragraphs) * pagesPerCharacter);
  return { page, pageCount: Math.max(pageCount, page + 1), isEstimate: true };
}

function lengthOf(paragraphs: readonly string[]): number {
  return paragraphs.reduce((sum, paragraph) => sum + paragraph.length, 0);
}
