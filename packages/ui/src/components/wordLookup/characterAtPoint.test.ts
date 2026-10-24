import { afterEach, describe, expect, it, vi } from "vitest";
import { characterOffsetAt } from "./characterAtPoint.ts";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

/** A word whose text is laid out 16 px per UTF-16 code unit, on one line 20 px high. */
function laidOutWord(text: string) {
  const word = document.createElement("span");
  word.textContent = text;
  document.body.append(word);
  vi.spyOn(Range.prototype, "getClientRects").mockImplementation(function (
    this: Range,
  ) {
    const rect = new DOMRect(
      this.startOffset * 16,
      0,
      (this.endOffset - this.startOffset) * 16,
      20,
    );
    return Object.assign([rect], {
      item: () => rect,
    }) as unknown as DOMRectList;
  });
  return word;
}

describe("characterOffsetAt", () => {
  it("finds the character under the point", () => {
    expect(characterOffsetAt(laidOutWord("映画を見る"), { x: 50, y: 10 })).toBe(
      3,
    );
  });

  it("counts a character outside the Basic Multilingual Plane as two code units", () => {
    expect(characterOffsetAt(laidOutWord("𠮷野家"), { x: 40, y: 10 })).toBe(2);
  });

  it("finds nothing below the text", () => {
    expect(
      characterOffsetAt(laidOutWord("映画を見る"), { x: 50, y: 30 }),
    ).toBeNull();
  });
});
