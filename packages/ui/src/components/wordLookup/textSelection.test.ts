import { describe, expect, it } from "vitest";
import { selectionWithin, trimmedSpan } from "./textSelection.ts";

describe("trimmedSpan", () => {
  it("leaves out the spaces around the text", () => {
    expect(trimmedSpan("Der Hund schläft.", 3, 9)).toEqual({
      text: "Hund",
      start: 4,
      end: 8,
    });
  });

  it("finds nothing in text without a letter", () => {
    expect(trimmedSpan("Der Hund, der schläft.", 8, 10)).toBeNull();
  });
});

/** A paragraph whose words are elements of their own, as `ClickableText` draws them, with the text from `from` to `to` selected. */
function selectIn(from: number, to: number) {
  const root = document.createElement("p");
  root.innerHTML = "Der <span>Hund</span> <span>schläft</span>.";
  document.body.replaceChildren(root);
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  const pointAt = (offset: number) => {
    let remaining = offset;
    for (const node of textNodes) {
      if (remaining <= node.length) return { node, offset: remaining };
      remaining -= node.length;
    }
    throw new Error("The offset lies past the text.");
  };
  const range = document.createRange();
  const start = pointAt(from);
  const end = pointAt(to);
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  document.getSelection()?.removeAllRanges();
  document.getSelection()?.addRange(range);
  return root;
}

describe("selectionWithin", () => {
  it("tells where text selected across several elements lies in the passage", () => {
    const root = selectIn(4, 16);
    expect(selectionWithin(root)).toMatchObject({
      text: "Hund schläft",
      start: 4,
      end: 16,
    });
  });

  it("finds nothing while the selection is empty", () => {
    const root = selectIn(4, 4);
    expect(selectionWithin(root)).toBeNull();
  });
});
