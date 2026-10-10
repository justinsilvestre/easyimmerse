import type { ChosenWord, LookupCursor } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { cuePositionOf, cursorIn } from "./cueCursor.ts";

const firstCue: Cue = {
  index: 1,
  start_ms: 0,
  end_ms: 1000,
  text: "The cat sleeps.",
};
const secondCue: Cue = {
  index: 2,
  start_ms: 1000,
  end_ms: 2000,
  text: "The dog eats.",
};

const cat: ChosenWord = {
  word: { term: "cat", query: null },
  source: { kind: "cue", cue: firstCue },
  occurrence: { passage: "1", start: 4 },
  anchor: { elementId: "cat" },
};

const catCursor: LookupCursor = { chosen: cat, input: "mouse", pointed: cat };

describe("cuePositionOf", () => {
  it("places the cursor in its cue with the length its highlight covers", () => {
    expect(cuePositionOf(catCursor, 3)).toEqual({
      cueIndex: 1,
      start: 4,
      input: "mouse",
      matchedLength: 3,
    });
  });

  it("leaves the length unset while it is unknown", () => {
    expect(cuePositionOf(catCursor, undefined)).toEqual({
      cueIndex: 1,
      start: 4,
      input: "mouse",
    });
  });

  it("gives no place to a cursor outside the subtitles", () => {
    const inBook: LookupCursor = {
      ...catCursor,
      chosen: { ...catCursor.chosen, source: null },
    };
    expect(cuePositionOf(inBook, 3)).toBeNull();
  });
});

describe("cursorIn", () => {
  const position = { cueIndex: 1, start: 4, input: "mouse" as const };

  it("gives the cursor to the card of its cue", () => {
    expect(cursorIn(position, firstCue)).toBe(position);
  });

  it("gives null to the card of another cue, which then keeps its props while the cursor moves", () => {
    expect(cursorIn(position, secondCue)).toBeNull();
  });
});
