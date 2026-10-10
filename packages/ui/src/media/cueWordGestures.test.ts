import { describe, expect, it } from "vitest";
import { activeCueWordOf, activeWordIn } from "./cueWordGestures.ts";

const cue = (index: number) => ({
  index,
  start_ms: 0,
  end_ms: 1000,
  text: "Der Hund.",
});
const activeWord = { cueIndex: 2, start: 4, length: 4, popupId: "p" };

describe("activeWordIn", () => {
  it("gives the word the pop-up shows to the card of its cue", () => {
    expect(activeWordIn(activeWord, cue(2))).toBe(activeWord);
  });

  it("gives nothing to the card of another cue, which then keeps its props", () => {
    expect(activeWordIn(activeWord, cue(1))).toBeUndefined();
  });
});

describe("activeCueWordOf", () => {
  const shown = {
    source: { kind: "cue" as const, cue: cue(2) },
    start: 4,
    length: 4,
    popupId: "p",
  };

  it("gives the word of a cue the pop-up shows, highlighted while there is no cursor", () => {
    expect(activeCueWordOf(shown, false)).toEqual({
      cueIndex: 2,
      start: 4,
      length: 4,
      popupId: "p",
      isHighlighted: true,
    });
  });

  it("leaves the pop-up's word unhighlighted while the cursor lies on another word", () => {
    expect(activeCueWordOf(shown, true)?.isHighlighted).toBe(false);
  });

  it("gives nothing while the pop-up shows no word of a cue", () => {
    expect(activeCueWordOf({ ...shown, source: null }, false)).toBeUndefined();
  });
});
