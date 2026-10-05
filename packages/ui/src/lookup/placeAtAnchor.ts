/** Where a word lies in the viewport, in CSS pixels, as `getBoundingClientRect` reports it. */
export type AnchorRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** The band of the viewport a pop-up may fill, above or below its word, and the horizontal middle of the word. */
export type AnchorPlacement = {
  side: "above" | "below";
  /** Distance from the viewport's top edge. */
  top: number;
  /** Distance from the viewport's bottom edge. */
  bottom: number;
  centerX: number;
};

const gap = 8;
const margin = 8;

/** Places a pop-up on whichever side of a word has more room, so that it never covers the word. */
export function placeAtAnchor(
  anchor: AnchorRect,
  viewportHeight: number,
): AnchorPlacement {
  const centerX = (anchor.left + anchor.right) / 2;
  const roomAbove = anchor.top;
  const roomBelow = viewportHeight - anchor.bottom;
  return roomAbove > roomBelow
    ? {
        side: "above",
        top: margin,
        bottom: viewportHeight - anchor.top + gap,
        centerX,
      }
    : { side: "below", top: anchor.bottom + gap, bottom: margin, centerX };
}

/** Reads where an element lies in the viewport. */
export function anchorOf(element: Element): AnchorRect {
  const { top, bottom, left, right } = element.getBoundingClientRect();
  return { top, bottom, left, right };
}
