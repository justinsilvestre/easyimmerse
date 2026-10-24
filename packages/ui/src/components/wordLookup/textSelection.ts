import type { AnchorRect } from "@easyimmerse/state";

/** Text the user selected in a passage: the text, where it begins and ends there in UTF-16 code units, and where it lies in the window. */
export type TextSelection = {
  text: string;
  start: number;
  end: number;
  /** Null where the browser cannot measure the selection. */
  rect: AnchorRect | null;
};

/**
 * Returns the text selected inside `root`, without the spaces around it, with offsets in the text of the text nodes in `root`
 * that `isCounted` accepts, which leaves out text shown beside the passage's own, such as a translation.
 * Null when nothing is selected, the selection reaches outside `root`, or it holds no letter or digit.
 */
export function selectionWithin(
  root: Element,
  isCounted: (node: Node) => boolean = countsEveryNode,
): TextSelection | null {
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return null;
  const range = selection.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null;
  const start = textOffsetOf(
    root,
    range.startContainer,
    range.startOffset,
    isCounted,
  );
  const end = textOffsetOf(
    root,
    range.endContainer,
    range.endOffset,
    isCounted,
  );
  const trimmed = trimmedSpan(textOf(root, isCounted), start, end);
  return trimmed && { ...trimmed, rect: rectOf(range) };
}

/** Returns the span between two offsets of a text without the spaces at either end, or null when it holds no letter or digit. */
export function trimmedSpan(text: string, start: number, end: number) {
  const span = text.slice(start, end);
  const leading = span.length - span.trimStart().length;
  const trimmed = span.trim();
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return null;
  return {
    text: trimmed,
    start: start + leading,
    end: start + leading + trimmed.length,
  };
}

function countsEveryNode() {
  return true;
}

/** The text of `root`'s counted text nodes, in order. */
function textOf(root: Element, isCounted: (node: Node) => boolean): string {
  return textNodesOf(root, isCounted)
    .map((node) => node.data)
    .join("");
}

/** The offset in the text of `root`'s counted text nodes of a boundary point of a range. */
function textOffsetOf(
  root: Element,
  container: Node,
  offset: number,
  isCounted: (node: Node) => boolean,
): number {
  const boundary = root.ownerDocument.createRange();
  boundary.setStart(container, offset);
  let counted = 0;
  for (const node of textNodesOf(root, isCounted)) {
    if (node === container) return counted + offset;
    // A node wholly before the boundary counts in full.
    if (boundary.comparePoint(node, node.length) <= 0) counted += node.length;
  }
  return counted;
}

function textNodesOf(
  root: Element,
  isCounted: (node: Node) => boolean,
): Text[] {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (isCounted(node)) nodes.push(node);
  }
  return nodes;
}

function rectOf(range: Range): AnchorRect | null {
  if (typeof range.getBoundingClientRect !== "function") return null;
  const { top, bottom, left, right } = range.getBoundingClientRect();
  return { top, bottom, left, right };
}
