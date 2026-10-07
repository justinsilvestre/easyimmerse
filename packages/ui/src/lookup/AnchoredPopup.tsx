import clsx from "clsx";
import type { ReactNode } from "react";
import { useViewportSize } from "../hooks/useViewportSize.ts";
import { placeAtAnchor } from "./placeAtAnchor.ts";
import { type PopupSize, popupWidthPx } from "./popupSize.ts";
import { useAnchorRect } from "./useAnchorRect.ts";
import { useIsGliding } from "./useIsGliding.ts";

/**
 * Holds the dictionary pop-up at the word it shows, following the word as it moves, inside the window less a margin.
 * Compact, it stands on whichever side of the word has more room, without covering the word;
 * expanded, it spans the window's height and may cover the word. Either way it is centred on the word as far as the window allows.
 * It glides from one word to the next on the same side, and appears at once where it first opens or when it changes sides.
 * Without a word, as when it opens on its search field, it sits above the player's controls.
 * The wrapper lets the pointer through beside the pop-up, so that only the pop-up itself counts as inside.
 * `onPointerInsideChange` reports the pointer entering and leaving the pop-up.
 */
export function AnchoredPopup({
  anchor,
  size = "compact",
  onPointerInsideChange,
  children,
}: {
  anchor: Element | null;
  size?: PopupSize;
  onPointerInsideChange?: (isInside: boolean) => void;
  children: ReactNode;
}) {
  const rect = useAnchorRect(anchor);
  const viewport = useViewportSize();
  const place = rect && placeAtAnchor(rect, popupWidthPx(size), viewport, size);
  const isGliding = useIsGliding(place);
  const { side, ...style } = place ?? {};
  return (
    <div
      onPointerEnter={() => onPointerInsideChange?.(true)}
      onPointerLeave={() => onPointerInsideChange?.(false)}
      data-side={side}
      data-size={size}
      style={style}
      className={clsx(
        "pointer-events-none z-30 flex *:pointer-events-auto",
        place
          ? "fixed flex-col"
          : "fixed inset-x-2 top-16 bottom-2 items-end justify-center md:absolute md:inset-x-auto md:bottom-28 md:left-1/2 md:-translate-x-1/2",
        side === "above" && "justify-end",
        side === "below" && "justify-start",
        isGliding &&
          "transition-[top,bottom,left,width] duration-150 ease-out motion-reduce:transition-none",
      )}
    >
      {children}
    </div>
  );
}
