import type { Document } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { unwrapHardLineBreaks } from "./unwrapHardLineBreaks.ts";

/** Lines of the given length, as a text wrapped at that width would have. */
function wrappedParagraph(width: number, lineCount = 3): string {
  const line = "x".repeat(width);
  return [...Array(lineCount - 1).fill(line), "end."].join("\n");
}

/** A document whose first paragraph is the one under test, followed by enough wrapped prose to show the wrapping width. */
function documentWith(paragraph: string, width = 70): Document {
  return {
    title: "",
    language: null,
    chapters: [
      {
        title: null,
        paragraphs: [paragraph, ...Array(6).fill(wrappedParagraph(width))],
      },
    ],
  };
}

function unwrapFirst(paragraph: string, width?: number): string | undefined {
  return unwrapHardLineBreaks(documentWith(paragraph, width)).chapters[0]
    ?.paragraphs[0];
}

describe("unwrapHardLineBreaks", () => {
  it("joins lines wrapped at the text's width", () => {
    expect(unwrapFirst(wrappedParagraph(70))).not.toContain("\n");
  });

  it("joins lines wrapped at a narrow width when the whole text is that narrow", () => {
    expect(unwrapFirst(wrappedParagraph(40), 40)).not.toContain("\n");
  });

  it("keeps the breaks between lines much shorter than the text's width", () => {
    expect(unwrapFirst("Roses are red,\nviolets are blue.\nend.")).toBe(
      "Roses are red,\nviolets are blue.\nend.",
    );
  });

  it("keeps the breaks in a paragraph whose later lines are indented", () => {
    const line = "x".repeat(70);
    expect(unwrapFirst(`${line}\n    ${line}\nend.`)).toContain("\n");
  });

  it("joins a paragraph whose first line alone is indented", () => {
    const line = "x".repeat(70);
    expect(unwrapFirst(`    ${line}\n${line}\nend.`)).not.toContain("\n");
  });

  it("joins lines of a script written without spaces with a zero-width space", () => {
    const line = "字".repeat(70);
    expect(unwrapFirst(`${line}\n${line}\n完。`)).toBe(
      `${line}\u200B${line}\u200B完。`,
    );
  });

  it("joins a line ending in full-width punctuation with a zero-width space", () => {
    const line = `${"字".repeat(69)}，`;
    expect(unwrapFirst(`${line}\n${line}\n完。`)).toBe(
      `${line}\u200B${line}\u200B完。`,
    );
  });

  it("keeps each break as one character, so offsets stay the same", () => {
    const paragraph = wrappedParagraph(70);
    expect(unwrapFirst(paragraph)?.length).toBe(paragraph.length);
  });

  it("leaves a document with too few wrapped lines to judge unchanged", () => {
    const document: Document = {
      title: "",
      language: null,
      chapters: [{ title: null, paragraphs: [wrappedParagraph(70)] }],
    };
    expect(unwrapHardLineBreaks(document)).toBe(document);
  });
});
