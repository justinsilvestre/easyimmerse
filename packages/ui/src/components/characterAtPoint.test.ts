import { afterEach, describe, expect, it, vi } from "vitest";
import { characterOffsetAt } from "./characterAtPoint.ts";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

/** A button whose text is laid out 16 px per UTF-16 code unit, on one line 20 px high. */
function laidOutButton(text: string) {
  const button = document.createElement("button");
  button.textContent = text;
  document.body.append(button);
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
  return button;
}

describe("characterOffsetAt", () => {
  it("finds the character under the point", () => {
    expect(
      characterOffsetAt(laidOutButton("映画を見る"), { x: 50, y: 10 }),
    ).toBe(3);
  });

  it("counts a character outside the Basic Multilingual Plane as two code units", () => {
    expect(characterOffsetAt(laidOutButton("𠮷野家"), { x: 40, y: 10 })).toBe(
      2,
    );
  });

  it("finds nothing below the text", () => {
    expect(
      characterOffsetAt(laidOutButton("映画を見る"), { x: 50, y: 30 }),
    ).toBeNull();
  });
});
