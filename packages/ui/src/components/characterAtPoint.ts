/** A point in the viewport, in CSS pixels. */
export type ViewportPoint = { x: number; y: number };

/**
 * Finds the character of an element's text under a point, as its offset in that text in UTF-16 code units,
 * or null when no character lies there.
 *
 * Each character is measured with a range, rather than asked of the browser's caret position:
 * caret positions are unreliable inside buttons and in text that cannot be selected, which a held tap requires.
 * The offset is always that of a whole character, never of half a surrogate pair.
 */
export function characterOffsetAt(
  element: Element,
  point: ViewportPoint,
): number | null {
  let offset = 0;
  for (const node of textNodesOf(element)) {
    const found = characterInNodeAt(node, point);
    if (found !== null) return offset + found;
    offset += node.data.length;
  }
  return null;
}

function textNodesOf(element: Element): Text[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    nodes.push(node as Text);
  return nodes;
}

function characterInNodeAt(node: Text, point: ViewportPoint): number | null {
  const range = document.createRange();
  let start = 0;
  for (const character of node.data) {
    range.setStart(node, start);
    range.setEnd(node, start + character.length);
    if ([...range.getClientRects()].some((rect) => contains(rect, point)))
      return start;
    start += character.length;
  }
  return null;
}

function contains(rect: DOMRect, { x, y }: ViewportPoint): boolean {
  return (
    rect.width > 0 &&
    x >= rect.left &&
    x < rect.right &&
    y >= rect.top &&
    y < rect.bottom
  );
}
