import type { Document } from "@easyimmerse/types";

/** The share of the text's usual line length that a line must reach to count as wrapped rather than deliberately short. */
const wrappedLineShare = 0.75;
/** The fewest wrapped lines from which the text's usual line length can be judged. */
const minLinesToJudge = 10;

/**
 * Joins a line to the next in a script written without spaces between words, such as Chinese.
 * It is invisible, and lets offsets into the text stay the same.
 */
export const zeroWidthSpace = "\u200B";

/** A character of a script written without spaces, or of the full-width punctuation set with such scripts. */
const spacelessCharacter =
  "[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Thai}\\p{Script=Lao}\\p{Script=Khmer}\\p{Script=Myanmar}\\u3000-\\u303f\\uff00-\\uffef]";
const endsSpaceless = new RegExp(`${spacelessCharacter}$`, "u");
const startsSpaceless = new RegExp(`^${spacelessCharacter}`, "u");

/**
 * Removes the line breaks that plain-text books put at a fixed width, so that the text can flow to fit the screen.
 * Breaks that look deliberate stay: those in paragraphs with lines much shorter than the rest of the text, as in verse, and those before an indented line.
 * Each break becomes one character, so that offsets into the paragraphs stay the same:
 * a space, or a zero-width space beside a script written without spaces.
 */
export function unwrapHardLineBreaks(document: Document): Document {
  const width = usualLineLength(document);
  if (width === null) return document;
  return {
    ...document,
    chapters: document.chapters.map((chapter) => ({
      ...chapter,
      paragraphs: chapter.paragraphs.map((paragraph) =>
        unwrapParagraph(paragraph, width * wrappedLineShare),
      ),
    })),
  };
}

function unwrapParagraph(paragraph: string, minLength: number): string {
  const lines = paragraph.split("\n");
  const isWrapped =
    lines.slice(0, -1).every((line) => line.trim().length >= minLength) &&
    lines.slice(1).every((line) => !/^\s/.test(line));
  return isWrapped ? joinLines(lines) : paragraph;
}

function joinLines(lines: readonly string[]): string {
  return lines.reduce((joined, line, index) => {
    const isSpaceless =
      endsSpaceless.test(lines[index - 1] ?? "") || startsSpaceless.test(line);
    return joined + (isSpaceless ? zeroWidthSpace : " ") + line;
  });
}

/** The median length of the lines that end in a break, or null when there are too few to tell. */
function usualLineLength(document: Document): number | null {
  const lengths = document.chapters
    .flatMap((chapter) => chapter.paragraphs)
    .flatMap((paragraph) => paragraph.split("\n").slice(0, -1))
    .map((line) => line.trim().length)
    .sort((a, b) => a - b);
  if (lengths.length < minLinesToJudge) return null;
  return lengths[Math.floor(lengths.length / 2)] ?? null;
}
