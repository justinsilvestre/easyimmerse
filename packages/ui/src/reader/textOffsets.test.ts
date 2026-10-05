import { describe, expect, it } from "vitest";
import { offsetWithin, rangeOfSpan } from "./textOffsets.ts";

/** A paragraph whose text a search mark splits into three text nodes. */
function createMarkedParagraph(): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "Der <mark>Käfer</mark> schlief";
  return paragraph;
}

describe("offsetWithin", () => {
  it("counts the characters of the text nodes before the node", () => {
    const paragraph = createMarkedParagraph();
    const lastNode = paragraph.lastChild as Node;
    expect(offsetWithin(paragraph, lastNode, 2)).toBe(11);
  });
});

describe("rangeOfSpan", () => {
  it("covers a span that crosses from one text node into the next", () => {
    expect(rangeOfSpan(createMarkedParagraph(), 2, 7)?.toString()).toBe(
      "r Käf",
    );
  });

  it("ends a span past the text at the end of the last node", () => {
    expect(rangeOfSpan(createMarkedParagraph(), 10, 99)?.toString()).toBe(
      "schlief",
    );
  });
});
