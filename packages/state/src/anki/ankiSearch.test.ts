import { describe, expect, it } from "vitest";
import { ankiSearchOf, flashcardNoteQuery } from "./ankiSearch.ts";

describe("flashcardNoteQuery", () => {
  it("searches the id field for the flashcard's id", () => {
    expect(flashcardNoteQuery("0190-ab")).toBe('"easyImmerse id:0190-ab"');
  });

  it("escapes the characters Anki's search treats specially", () => {
    expect(flashcardNoteQuery('a_b*c"d')).toBe(
      '"easyImmerse id:a\\_b\\*c\\"d"',
    );
  });
});

describe("ankiSearchOf", () => {
  it("finds the notes of any of the flashcards", () => {
    expect(ankiSearchOf(["f1", "f2"])).toBe(
      '"easyImmerse id:f1" OR "easyImmerse id:f2"',
    );
  });
});
