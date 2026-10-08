import clsx from "clsx";
import type { ReactNode } from "react";
import { useViewportSize } from "../hooks/useViewportSize.ts";
import { placeAtAnchor } from "../lookup/placeAtAnchor.ts";
import { type PopupSize, popupWidthPx } from "../lookup/popupSize.ts";
import { useIsGliding } from "../lookup/useIsGliding.ts";

/**
 * Holds the dictionary pop-up beside the word it is about, placed as `placeAtAnchor` describes.
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
  const viewport = useViewportSize();
  const place =
    isWide && wordRect
      ? placeAtAnchor(wordRect, popupWidthPx(size), viewport, size)
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
          "transition-[top,bottom,left,width] duration-150 ease-out motion-reduce:transition-none",
      )}
      style={style}
    >
      {children}
    </div>
  );
}
