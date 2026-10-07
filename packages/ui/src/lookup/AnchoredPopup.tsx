import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { placeAtAnchor } from "./placeAtAnchor.ts";
import { type PopupSize, popupLeft, popupWidth } from "./popupSize.ts";
import { useAnchorRect } from "./useAnchorRect.ts";

/**
 * Holds the dictionary pop-up at the word it shows, on whichever side of the word has more room,
 * and inside the viewport, following the word as it moves.
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
  const placement = rect && placeAtAnchor(rect, window.innerHeight);
  const style: CSSProperties | undefined = placement
    ? {
        top: placement.top,
        bottom: placement.bottom,
        left: popupLeft(size, placement.centerX),
        width: popupWidth(size),
      }
    : undefined;
  return (
    <div
      onPointerEnter={() => onPointerInsideChange?.(true)}
      onPointerLeave={() => onPointerInsideChange?.(false)}
      data-side={placement?.side}
      data-size={size}
      style={style}
      className={clsx(
        "pointer-events-none z-30 flex *:pointer-events-auto",
        placement
          ? "fixed flex-col"
          : "fixed inset-x-2 top-16 bottom-2 items-end justify-center md:absolute md:inset-x-auto md:bottom-28 md:left-1/2 md:-translate-x-1/2",
        placement?.side === "above" && "justify-end",
        placement?.side === "below" && "justify-start",
      )}
    >
      {children}
    </div>
  );
}
