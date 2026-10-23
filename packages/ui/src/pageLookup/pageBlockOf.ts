/**
 * Finds the nearest element around a node of a web page that the browser lays out as a block, such as a paragraph or a list item,
 * whose text a lookup on the page reads as one.
 */
export function pageBlockOf(node: Node): Element | null {
  for (
    let element = node.parentElement;
    element;
    element = element.parentElement
  )
    if (isBlock(element)) return element;
  return null;
}

function isBlock(element: Element): boolean {
  // A display that is not set takes its initial value, inline.
  const display = getComputedStyle(element).display || "inline";
  return !display.startsWith("inline") && display !== "contents";
}
