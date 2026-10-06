import type { ReactNode } from "react";
import { popupPlacement } from "./popupPlacement.ts";

/** The width of the dictionary pop-up, which sets where it can be centered. */
const popupWidthPx = 352;

/**
 * Holds the dictionary pop-up beside the word it is about.
 * On a phone, or when it opens on its search field, it sits at the bottom of the window instead.
 * `onPointerInsideChange` reports the pointer entering and leaving the pop-up.
 */
export function LookupAnchor({
  wordRect,
  isWide,
  onPointerInsideChange,
  children,
}: {
  wordRect: DOMRect | null;
  isWide: boolean;
  onPointerInsideChange?: (isInside: boolean) => void;
  children: ReactNode;
}) {
  // The wrapper lets the pointer through beside the pop-up, so that only the pop-up itself counts as inside.
  const pointerProps = {
    onPointerEnter: () => onPointerInsideChange?.(true),
    onPointerLeave: () => onPointerInsideChange?.(false),
  };
  if (!isWide || !wordRect)
    return (
      <div
        {...pointerProps}
        className="pointer-events-none fixed inset-x-2 bottom-2 z-30 flex max-h-[60dvh] justify-center *:pointer-events-auto"
      >
        {children}
      </div>
    );
  const placement = popupPlacement(wordRect, popupWidthPx, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  return (
    <div
      {...pointerProps}
      className="pointer-events-none fixed z-30 flex font-sans *:pointer-events-auto transition-[top,bottom,left] duration-150"
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
