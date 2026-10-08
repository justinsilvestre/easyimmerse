import type { Cue } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { WordHit } from "../components/useWordGestures.ts";
import { type CueCursor, reduceCueCursor } from "./cueCursor.ts";

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

function hitAt(start: number, input: WordHit["input"]): WordHit {
  return {
    word: "cat",
    start,
    element: document.createElement("span"),
    input,
  };
}

/** A cursor the mouse put on "cat" of the first cue, whose lookup matched three characters. */
function answeredCursor(): CueCursor {
  const hit = hitAt(4, "mouse");
  return {
    cue: firstCue,
    hit,
    position: { cueIndex: 1, start: 4, input: "mouse", matchedLength: 3 },
  };
}

describe("reduceCueCursor", () => {
  it("places the cursor in the cue pointed at", () => {
    const cursor = reduceCueCursor(answeredCursor(), {
      type: "pointed",
      cue: secondCue,
      hit: hitAt(4, "keyboard"),
    });
    expect(cursor?.position).toEqual({
      cueIndex: 2,
      start: 4,
      input: "keyboard",
    });
  });

  it("keeps the cursor while the mouse moves within the text its lookup matched", () => {
    const cursor = answeredCursor();
    expect(
      reduceCueCursor(cursor, {
        type: "pointed",
        cue: firstCue,
        hit: hitAt(5, "mouse"),
      }),
    ).toBe(cursor);
  });

  it("starts afresh at the same place in another cue", () => {
    const cursor = reduceCueCursor(answeredCursor(), {
      type: "pointed",
      cue: secondCue,
      hit: hitAt(4, "mouse"),
    });
    expect(cursor?.position.matchedLength).toBeUndefined();
  });

  it("takes the length a cached lookup matched when pointed", () => {
    const cursor = reduceCueCursor(null, {
      type: "pointed",
      cue: secondCue,
      hit: hitAt(4, "mouse"),
      matchedLength: 3,
    });
    expect(cursor?.position.matchedLength).toBe(3);
  });

  it("keeps the length the lookup matched once it answers", () => {
    const hit = hitAt(4, "keyboard");
    const cursor = reduceCueCursor(null, {
      type: "answered",
      cue: secondCue,
      hit,
      matchedLength: 3,
    });
    expect(cursor?.position.matchedLength).toBe(3);
  });

  it("goes when the input that placed it leaves", () => {
    expect(
      reduceCueCursor(answeredCursor(), { type: "left", input: "mouse" }),
    ).toBeNull();
  });

  it("stays when another input leaves", () => {
    const cursor = answeredCursor();
    expect(reduceCueCursor(cursor, { type: "left", input: "keyboard" })).toBe(
      cursor,
    );
  });
});
