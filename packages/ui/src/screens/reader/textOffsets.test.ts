import { describe, expect, it } from "vitest";
import {
  offsetWithin,
  paragraphTextOf,
  rangeOfSpan,
  translationAttribute,
} from "./textOffsets.ts";

/** A paragraph whose text a search mark splits into three text nodes. */
function createMarkedParagraph(): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "Der <mark>Käfer</mark> schlief";
  return paragraph;
}

/** A paragraph of two sentences, as the interlinear view shows it, with the translation of the first between them. */
function createInterlinearParagraph(): HTMLParagraphElement {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = `Der Käfer schlief.<span ${translationAttribute}>The beetle slept.</span> Es regnete.`;
  return paragraph;
}

describe("offsetWithin", () => {
  it("counts the characters of the text nodes before the node", () => {
    const paragraph = createMarkedParagraph();
    const lastNode = paragraph.lastChild as Node;
    expect(offsetWithin(paragraph, lastNode, 2)).toBe(11);
  });

  it("passes over the translation shown inside the paragraph", () => {
    const paragraph = createInterlinearParagraph();
    const lastNode = paragraph.lastChild as Node;
    expect(offsetWithin(paragraph, lastNode, 1)).toBe(19);
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

  it("starts a span after the translation shown where it begins", () => {
    expect(rangeOfSpan(createInterlinearParagraph(), 18, 22)?.toString()).toBe(
      " Es ",
    );
  });
});

describe("paragraphTextOf", () => {
  it("leaves out the translation shown inside the paragraph", () => {
    expect(paragraphTextOf(createInterlinearParagraph())).toBe(
      "Der Käfer schlief. Es regnete.",
    );
  });
});
