import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { moveCursor } from "./lookupCursor.ts";
import type { LookupCursor } from "./lookupState.ts";
import { cat, chosenWord, secondCue } from "./lookupTestSupport.ts";

const catInSecondCue = chosenWord("cat", 4, secondCue);
const atInCat = chosenWord("at", 5);

/** A cursor the mouse put on "cat" of the first cue, whose lookup matched three characters. */
function answeredCursor(): LookupCursor {
  return { chosen: cat, input: "mouse", matchedLength: 3, pointed: cat };
}

describe("moveCursor", () => {
  it("places the cursor at the word pointed at in another passage", () => {
    const cursor = moveCursor(
      answeredCursor(),
      actions.lookupCursorMoved(catInSecondCue, "keyboard"),
    );
    expect(cursor).toEqual({
      chosen: catInSecondCue,
      input: "keyboard",
      pointed: catInSecondCue,
    });
  });

  it("keeps the cursor while the mouse moves within the text its lookup matched", () => {
    const cursor = moveCursor(
      answeredCursor(),
      actions.lookupCursorMoved(atInCat, "mouse"),
    );
    expect(cursor?.chosen).toBe(cat);
  });

  it("records the word under the mouse while it keeps the cursor", () => {
    const cursor = moveCursor(
      answeredCursor(),
      actions.lookupCursorMoved(atInCat, "mouse"),
    );
    expect(cursor?.pointed).toBe(atInCat);
  });

  it("keeps its identity when the mouse points at its own word again", () => {
    const cursor = answeredCursor();
    expect(moveCursor(cursor, actions.lookupCursorMoved(cat, "mouse"))).toBe(
      cursor,
    );
  });

  it("starts afresh at the same place in another passage", () => {
    const cursor = moveCursor(
      answeredCursor(),
      actions.lookupCursorMoved(catInSecondCue, "mouse"),
    );
    expect(cursor?.matchedLength).toBeUndefined();
  });

  it("keeps the cursor while the mouse moves within the match it shows from the cache", () => {
    const cursor = moveCursor(null, actions.lookupCursorMoved(cat, "mouse"));
    const moved = moveCursor(
      cursor,
      actions.lookupCursorMoved(atInCat, "mouse", 3),
    );
    expect(moved?.chosen).toBe(cat);
  });

  it("moves the cursor within a word whose match is not known", () => {
    const cursor = moveCursor(null, actions.lookupCursorMoved(cat, "mouse"));
    const moved = moveCursor(
      cursor,
      actions.lookupCursorMoved(atInCat, "mouse"),
    );
    expect(moved?.chosen).toBe(atInCat);
  });

  it("moves to the answered word with the length its lookup matched", () => {
    const cursor = moveCursor(answeredCursor(), {
      type: "answered",
      chosen: atInCat,
      input: "mouse",
      matchedLength: 2,
    });
    expect(cursor).toEqual({
      chosen: atInCat,
      input: "mouse",
      matchedLength: 2,
      pointed: atInCat,
    });
  });

  it("goes when the input that placed it leaves", () => {
    expect(
      moveCursor(answeredCursor(), {
        type: "lookupCursorLeft",
        input: "mouse",
      }),
    ).toBeNull();
  });

  it("stays when another input leaves", () => {
    const cursor = answeredCursor();
    expect(moveCursor(cursor, actions.lookupCursorLeft("keyboard"))).toBe(
      cursor,
    );
  });
});
