import type { ChosenWord } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import {
  exampleLibraryItem,
  exampleLibraryVideoText,
} from "../../testSupport/exampleLibrary.ts";
import {
  type LibraryWords,
  libraryFlashcardPlace,
  libraryLookupOf,
} from "./libraryWords.ts";

const cue: Cue = {
  index: 0,
  start_ms: 500,
  end_ms: 1500,
  text: "Der Hund schläft.",
};

const library: LibraryWords = {
  item: exampleLibraryItem(),
  text: exampleLibraryVideoText,
  projectId: "p1",
  mediaFileId: "m3",
  wordlessSource: null,
};

const chosenAt = (start: number): ChosenWord => ({
  word: { term: "", query: null },
  source: { kind: "cue", cue },
  occurrence: { passage: "0", start },
  anchor: null,
});

describe("libraryLookupOf", () => {
  it("shows the entry of the stored word a chosen place lies in", () => {
    expect(libraryLookupOf(library, chosenAt(6)).results[0]?.term).toBe("Hund");
  });

  it("finds nothing for a place that lies in no stored word", () => {
    expect(libraryLookupOf(library, chosenAt(3)).results).toEqual([]);
  });
});

describe("libraryFlashcardPlace", () => {
  it("makes a flashcard from the start of the stored word a chosen place lies in", () => {
    expect(libraryFlashcardPlace(library, chosenAt(6))).toEqual({
      projectId: "p1",
      mediaFileId: "m3",
      segmentIndex: 0,
      wordStart: 4,
    });
  });

  it("makes a flashcard of the whole segment for a place that lies in no stored word", () => {
    expect(libraryFlashcardPlace(library, chosenAt(3))?.wordStart).toBeNull();
  });
});
