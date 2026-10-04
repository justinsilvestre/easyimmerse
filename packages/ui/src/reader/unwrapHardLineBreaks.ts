import type { Document } from "@easyimmerse/types";

/** The shortest line that counts as filling the width of a hard-wrapped text. */
const minWrappedLineLength = 50;

/**
 * Replaces the line breaks inside each paragraph with spaces where the paragraph looks
 * hard-wrapped to a fixed width, as plain-text books usually are, so that the reader can
 * flow it to the screen. Short lines, as in verse, keep their breaks.
 * Each break becomes one space, so offsets into the paragraphs stay the same.
 */
export function unwrapHardLineBreaks(document: Document): Document {
  return {
    ...document,
    chapters: document.chapters.map((chapter) => ({
      ...chapter,
      paragraphs: chapter.paragraphs.map(unwrapParagraph),
    })),
  };
}

function unwrapParagraph(paragraph: string): string {
  const lines = paragraph.split("\n");
  const isWrapped = lines
    .slice(0, -1)
    .every((line) => line.length >= minWrappedLineLength);
  return isWrapped ? lines.join(" ") : paragraph;
}
