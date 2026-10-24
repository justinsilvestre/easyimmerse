/**
 * Helpers that translate between character offsets in a paragraph's text and positions in the DOM.
 * A paragraph may be split into several text nodes, for instance by search marks.
 * In the interlinear view a paragraph's element also holds the translation of each of its passages after the passage,
 * in elements that carry `translationAttribute`. Their text is not the paragraph's, so these helpers pass over it,
 * and offsets in the paragraph's text stay the offsets of its string in the document.
 */

/** The attribute that carries a paragraph's index on its element. */
export const paragraphAttribute = "data-paragraph";

/** The attribute of an element that shows translated text inside or beside a paragraph, which is not part of the paragraph's text. */
export const translationAttribute = "data-translation";

export function paragraphIndexOf(element: Element): number {
  return Number(element.getAttribute(paragraphAttribute));
}

/** The paragraph's own text, without the translations shown inside its element. */
export function paragraphTextOf(paragraph: Element): string {
  return textNodesOf(paragraph)
    .map((text) => text.data)
    .join("");
}

/** Whether a node lies in translated text that the reader shows beside the book's own. */
export function isInTranslation(node: Node): boolean {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(`[${translationAttribute}]`) != null;
}

/** Returns the range covering the characters from `start` to `end` of the paragraph's text. */
export function rangeOfSpan(
  paragraph: Element,
  start: number,
  end: number,
): Range | null {
  const from = textPositionAt(paragraph, start, "start");
  const to = textPositionAt(paragraph, end, "end");
  if (!from || !to) return null;
  const range = paragraph.ownerDocument.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

/** The rectangle of the character at the offset, or of the paragraph's last character past its end. */
export function characterRect(paragraph: Element, offset: number) {
  const length = paragraphTextOf(paragraph).length;
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

/**
 * The text node and offset of a position in the paragraph's text.
 * A position where one text node ends and the next begins lies at the start of the next for the start of a range,
 * and at the end of the first for its end, so that a range never takes in the translation shown between them.
 */
function textPositionAt(
  paragraph: Element,
  offset: number,
  side: "start" | "end",
) {
  let remaining = offset;
  let last: Text | null = null;
  for (const text of textNodesOf(paragraph)) {
    const isInside =
      side === "start" ? remaining < text.length : remaining <= text.length;
    if (isInside) return { node: text, offset: remaining };
    remaining -= text.length;
    last = text;
  }
  return last && { node: last, offset: last.length };
}

/** The text nodes of the paragraph's own text, in order, leaving out those of the translations shown inside it. */
function textNodesOf(paragraph: Element): Text[] {
  const walker = paragraph.ownerDocument.createTreeWalker(
    paragraph,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    (node) =>
      node instanceof Element
        ? node.hasAttribute(translationAttribute)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_ACCEPT,
  );
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
}
