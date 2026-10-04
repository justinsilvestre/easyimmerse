import type { ReactNode } from "react";
import { popupPlacement } from "./popupPlacement.ts";

/** The width of the dictionary pop-up, which sets where it can be centered. */
const popupWidthPx = 352;

/**
 * Holds the dictionary pop-up beside the word it is about. On a phone, or before any word
 * has been looked up, it sits at the bottom of the window instead.
 */
export function LookupAnchor({
  wordRect,
  isWide,
  children,
}: {
  wordRect: DOMRect | null;
  isWide: boolean;
  children: ReactNode;
}) {
  if (!isWide || !wordRect)
    return (
      <div className="fixed inset-x-2 bottom-2 z-30 flex max-h-[60dvh] justify-center">
        {children}
      </div>
    );
  const placement = popupPlacement(wordRect, popupWidthPx, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  return (
    <div
      className="fixed z-30 flex font-sans transition-[top,bottom,left] duration-150"
      style={{
        left: placement.left,
        top: placement.top,
        bottom: placement.bottom,
        maxHeight: placement.maxHeight,
        alignItems: placement.top === undefined ? "flex-end" : "flex-start",
      }}
    >
      {children}
    </div>
  );
}
