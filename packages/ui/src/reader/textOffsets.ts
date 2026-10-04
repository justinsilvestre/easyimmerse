/**
 * Helpers that translate between character offsets in a paragraph's text and positions in
 * the DOM. A paragraph may be split into several text nodes, for instance by search marks.
 */

/** The attribute that carries a paragraph's index on its element. */
export const paragraphAttribute = "data-paragraph";

export function paragraphIndexOf(element: Element): number {
  return Number(element.getAttribute(paragraphAttribute));
}

/** Returns the range covering the characters from `start` to `end` of the paragraph's text. */
export function rangeOfSpan(
  paragraph: Element,
  start: number,
  end: number,
): Range | null {
  const from = textPositionAt(paragraph, start);
  const to = textPositionAt(paragraph, end);
  if (!from || !to) return null;
  const range = paragraph.ownerDocument.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

/** The rectangle of the character at the offset, or of the paragraph's last character past its end. */
export function characterRect(paragraph: Element, offset: number) {
  const length = paragraph.textContent?.length ?? 0;
  const start = Math.max(0, Math.min(offset, length - 1));
  return rangeOfSpan(paragraph, start, start + 1)?.getClientRects()[0] ?? null;
}

/** Converts a position inside one of the paragraph's text nodes to an offset in its whole text. */
export function offsetWithin(
  paragraph: Element,
  node: Node,
  nodeOffset: number,
): number {
  let offset = 0;
  for (const text of textNodesOf(paragraph)) {
    if (text === node) return offset + nodeOffset;
    offset += text.length;
  }
  return offset;
}

/** Finds the text node and offset under a point in the window, where the browser can tell. */
export function caretAtPoint(
  x: number,
  y: number,
): { node: Node; offset: number } | null {
  if ("caretPositionFromPoint" in document) {
    const position = document.caretPositionFromPoint(x, y);
    return position && { node: position.offsetNode, offset: position.offset };
  }
  if ("caretRangeFromPoint" in document) {
    const range = (
      document as { caretRangeFromPoint(x: number, y: number): Range | null }
    ).caretRangeFromPoint(x, y);
    return range && { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

function textPositionAt(paragraph: Element, offset: number) {
  let remaining = offset;
  let last: Text | null = null;
  for (const text of textNodesOf(paragraph)) {
    if (remaining <= text.length) return { node: text, offset: remaining };
    remaining -= text.length;
    last = text;
  }
  return last && { node: last, offset: last.length };
}

function textNodesOf(paragraph: Element): Text[] {
  const walker = paragraph.ownerDocument.createTreeWalker(
    paragraph,
    NodeFilter.SHOW_TEXT,
  );
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}
