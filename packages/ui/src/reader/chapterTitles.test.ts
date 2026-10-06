import type { Document } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { chapterLabelOf, chapterTitleOf } from "./chapterTitles.ts";

function createDocument(titles: (string | null)[]): Document {
  return {
    title: "Book",
    language: "de",
    chapters: titles.map((title) => ({ title, paragraphs: ["Text."] })),
  };
}

describe("chapterLabelOf", () => {
  it("gives the chapter's title", () => {
    expect(chapterLabelOf(createDocument(["Eins", "Zwei"]), 1)).toBe("Zwei");
  });

  it("numbers a chapter without a title", () => {
    expect(chapterLabelOf(createDocument(["Eins", null]), 1)).toBe("Chapter 2");
  });
});

describe("chapterTitleOf", () => {
  it("numbers an untitled chapter of a longer book", () => {
    expect(chapterTitleOf(createDocument([null, null]), 0)).toBe("Chapter 1");
  });

  it("gives no name to the only chapter of a book when it is untitled", () => {
    expect(chapterTitleOf(createDocument([null]), 0)).toBeNull();
  });
});
