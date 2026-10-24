import { afterEach, describe, expect, it, vi } from "vitest";
import { locationTurningTo, type PagedText } from "./pagePositions.ts";
import { paragraphAttribute } from "./textOffsets.ts";

const stride = 100;

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Lays out one paragraph on each of the given pages, with its text and every character at the page's left edge.
 * Pages that hold no paragraph stand for pages that hold only a chapter heading.
 */
function pagedTextWithParagraphsOn(pages: readonly number[]): PagedText {
  const columns = document.createElement("div");
  pages.forEach((page, index) => {
    const paragraph = document.createElement("p");
    paragraph.setAttribute(paragraphAttribute, String(index));
    paragraph.dataset.page = String(page);
    paragraph.textContent = "ab";
    paragraph.getClientRects = () => rectsOnPage(page);
    columns.append(paragraph);
  });
  vi.spyOn(Range.prototype, "getClientRects").mockImplementation(function (
    this: Range,
  ) {
    const paragraph = this.startContainer.parentElement;
    return rectsOnPage(Number(paragraph?.dataset.page));
  });
  return { columns, stride };
}

function rectsOnPage(page: number): DOMRectList {
  return [new DOMRect(page * stride, 0, 10, 10)] as unknown as DOMRectList;
}

describe("locationTurningTo", () => {
  it("turns forward to the next page", () => {
    const text = pagedTextWithParagraphsOn([0, 1, 2]);
    expect(locationTurningTo(text, 0, 1, 0)?.paragraphIndex).toBe(1);
  });

  it("passes forward over a page that holds only a heading", () => {
    const text = pagedTextWithParagraphsOn([0, 2]);
    expect(locationTurningTo(text, 0, 1, 0)?.paragraphIndex).toBe(1);
  });

  it("passes back over a page that holds only a heading", () => {
    const text = pagedTextWithParagraphsOn([0, 2]);
    expect(locationTurningTo(text, 2, 1, 0)?.paragraphIndex).toBe(0);
  });

  it("finds no page past the last one with text", () => {
    const text = pagedTextWithParagraphsOn([0, 1]);
    expect(locationTurningTo(text, 1, 2, 0)).toBeNull();
  });
});
