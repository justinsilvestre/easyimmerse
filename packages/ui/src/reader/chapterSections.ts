import type { ReaderLocation } from "./readingProgress.ts";

/**
 * A run of consecutive paragraphs in a chapter, from `start` up to but not including `end`.
 * The paged layout shows one section at a time, so that a long chapter is never laid out whole.
 */
export type ChapterSection = { start: number; end: number };

/**
 * Divides a chapter's paragraphs into sections of at most `maxCharacters`, breaking only
 * between paragraphs. The sections are kept close to one size, so that none is much
 * shorter than the rest. A paragraph longer than the limit gets a section of its own.
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

/** The location at the start of the section's first paragraph, or at the end of its last. */
export function locationAtSectionEdge(
  chapterIndex: number,
  paragraphs: readonly string[],
  section: ChapterSection,
  edge: "start" | "end",
): ReaderLocation {
  if (edge === "start" || section.end <= section.start)
    return { chapterIndex, paragraphIndex: section.start, offset: 0 };
  const last = section.end - 1;
  return {
    chapterIndex,
    paragraphIndex: last,
    offset: paragraphs[last]?.length ?? 0,
  };
}
