import clsx from "clsx";
import type { ReactNode } from "react";
import { type PopupSize, popupWidthRem } from "../lookup/popupSize.ts";
import { useIsGliding } from "../lookup/useIsGliding.ts";
import { popupPlacement } from "./popupPlacement.ts";

/**
 * Holds the dictionary pop-up beside the word it is about.
 * It glides from one word to the next on the same side, and appears at once where it first opens or when it changes sides.
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
  const place =
    isWide && wordRect
      ? popupPlacement(wordRect, popupWidthPx(size), {
          width: window.innerWidth,
          height: window.innerHeight,
        })
      : null;
  const isGliding = useIsGliding(place);
  if (!place)
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
  const { side, ...style } = place;
  return (
    <div
      {...pointerProps}
      className={clsx(
        "pointer-events-none fixed z-30 flex flex-col font-sans *:pointer-events-auto",
        side === "above" ? "justify-end" : "justify-start",
        isGliding &&
          "transition-[top,bottom,left] duration-150 ease-out motion-reduce:transition-none",
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** The width of the dictionary pop-up at a size, in CSS pixels at the page's current text size, which sets where it can be centred. */
function popupWidthPx(size: PopupSize): number {
  const remPx = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return popupWidthRem[size] * (remPx || 16);
}
