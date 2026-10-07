import clsx from "clsx";
import type { ReactNode } from "react";
import type { PopupSize } from "../lookup/popupSize.ts";
import { popupPlacement } from "./popupPlacement.ts";

/** The width of the dictionary pop-up at each size, 26rem and 40rem, which sets where it can be centered. */
const popupWidthPx: Record<PopupSize, number> = { compact: 416, expanded: 640 };

/**
 * Holds the dictionary pop-up beside the word it is about.
 * On a phone, or when it opens on its search field, it sits at the bottom of the window instead.
 * `onPointerInsideChange` reports the pointer entering and leaving the pop-up.
 */
export function LookupAnchor({
  wordRect,
  isWide,
  size = "compact",
  onPointerInsideChange,
  children,
}: {
  wordRect: DOMRect | null;
  isWide: boolean;
  size?: PopupSize;
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
        className={clsx(
          "pointer-events-none fixed inset-x-2 bottom-2 z-30 flex flex-col items-center justify-end *:pointer-events-auto",
          size === "expanded" ? "h-[calc(100dvh-1rem)]" : "h-[60dvh]",
        )}
      >
        {children}
      </div>
    );
  const placement = popupPlacement(wordRect, popupWidthPx[size], {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  return (
    <div
      {...pointerProps}
      className={clsx(
        "pointer-events-none fixed z-30 flex flex-col font-sans *:pointer-events-auto transition-[top,bottom,left] duration-150",
        placement.side === "above" ? "justify-end" : "justify-start",
      )}
      style={{
        left: placement.left,
        top: placement.top,
        bottom: placement.bottom,
      }}
    >
      {children}
    </div>
  );
}
