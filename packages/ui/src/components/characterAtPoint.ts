/** A point in the viewport, in CSS pixels. */
export type ViewportPoint = { x: number; y: number };

type Caret = { node: Node; offset: number };

/**
 * Finds the character of an element's text under a point, as its offset in that text in UTF-16 code units.
 * Returns null when the browser cannot tell, or the point lies outside the element's text.
 * The offset always falls at the start of a character, never inside a surrogate pair.
 */
export function characterOffsetAt(
  element: Element,
  point: ViewportPoint,
): number | null {
  const caret = caretAt(point);
  if (caret === null || !(caret.node instanceof Text)) return null;
  if (!element.contains(caret.node)) return null;
  const text = element.textContent ?? "";
  if (text.length === 0) return null;
  const offset = textOffsetOf(element, caret.node) + caret.offset;
  const under = isBeforeCaret(caret, point) ? offset - 1 : offset;
  return characterStartAt(text, Math.min(Math.max(under, 0), text.length - 1));
}

/** The caret position the browser places at a point, through whichever of the two standard methods it offers. */
function caretAt({ x, y }: ViewportPoint): Caret | null {
  const position = document.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = document.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer, offset: range.startOffset }
    : null;
}

/** How many code units of the element's text come before the text node. */
function textOffsetOf(element: Element, node: Text): number {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let offset = 0;
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    if (current === node) return offset;
    offset += current.textContent?.length ?? 0;
  }
  return offset;
}

/**
 * Tells whether the point lies on the character before the caret rather than after it.
 * A browser places the caret at the nearer edge of a character, so a point on the right half of one has the caret after it.
 */
function isBeforeCaret(caret: Caret, point: ViewportPoint): boolean {
  if (caret.offset === 0) return false;
  const text = caret.node.textContent ?? "";
  const range = document.createRange();
  range.setStart(caret.node, characterStartAt(text, caret.offset - 1));
  range.setEnd(caret.node, caret.offset);
  const rect = range.getBoundingClientRect();
  return rect.width > 0 && point.x >= rect.left && point.x <= rect.right;
}

/** Moves an offset back to the start of its character, when it falls between the halves of a surrogate pair. */
function characterStartAt(text: string, offset: number): number {
  const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;
  return offset > 0 && isLowSurrogate(text.charCodeAt(offset))
    ? offset - 1
    : offset;
}
