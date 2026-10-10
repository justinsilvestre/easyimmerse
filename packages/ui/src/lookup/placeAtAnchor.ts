import type { AnchorRect } from "@easyimmerse/state";
import type { PopupSize } from "./popupSize.ts";

export type { AnchorRect } from "@easyimmerse/state";

/** The size of the viewport, in CSS pixels. */
export type ViewportSize = { width: number; height: number };

/**
 * Where a pop-up stands, in CSS pixels: the side of its word, and a band of the viewport for it to fill,
 * given by the distances of its edges from the viewport's top, bottom and left edges, and its width.
 */
export type AnchorPlacement = {
  side: "above" | "below";
  top: number;
  bottom: number;
  left: number;
  width: number;
};

/** The space kept between a compact pop-up and its word. */
const gap = 8;
/** The space kept between a pop-up and the viewport's edges. */
const margin = 8;

/**
 * Places a pop-up of the given width at a word, within the viewport less a margin.
 * A compact pop-up stands on whichever side of the word has more room, in the band from the word to that side's margin,
 * so that it never covers the word. An expanded pop-up fills the viewport's height, covering the word.
 * Either way the pop-up is centred on the word as far as the viewport allows, and narrowed to fit a narrow viewport.
 */
export function placeAtAnchor(
  anchor: AnchorRect,
  popupWidth: number,
  viewport: ViewportSize,
  size: PopupSize,
): AnchorPlacement {
  const width = Math.min(popupWidth, viewport.width - 2 * margin);
  const left = clamp(
    (anchor.left + anchor.right) / 2 - width / 2,
    margin,
    viewport.width - width - margin,
  );
  const band = bandAt(anchor, viewport.height);
  if (size === "expanded")
    return { side: band.side, top: margin, bottom: margin, left, width };
  return { ...band, left, width };
}

/** The band between a word and the viewport's margin on the side of the word with more room. */
function bandAt(
  anchor: AnchorRect,
  viewportHeight: number,
): Pick<AnchorPlacement, "side" | "top" | "bottom"> {
  const roomAbove = anchor.top;
  const roomBelow = viewportHeight - anchor.bottom;
  return roomAbove > roomBelow
    ? { side: "above", top: margin, bottom: viewportHeight - anchor.top + gap }
    : { side: "below", top: anchor.bottom + gap, bottom: margin };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/** Reads where an element lies in the viewport. */
export function anchorOf(element: Element): AnchorRect {
  const { top, bottom, left, right } = element.getBoundingClientRect();
  return { top, bottom, left, right };
}
