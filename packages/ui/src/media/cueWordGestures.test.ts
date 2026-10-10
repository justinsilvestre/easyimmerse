import { describe, expect, it } from "vitest";
import { activeWordIn } from "./cueWordGestures.ts";

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
