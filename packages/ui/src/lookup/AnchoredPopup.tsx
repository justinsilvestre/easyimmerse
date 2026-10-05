import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { placeAtAnchor } from "./placeAtAnchor.ts";
import { useAnchorRect } from "./useAnchorRect.ts";

/**
 * Holds the dictionary pop-up at the word it shows, on whichever side of the word has more room,
 * and inside the viewport, following the word as it moves.
 * Without a word, as when it opens on its search field, it sits above the player's controls.
 * `onPointerInsideChange` reports the pointer entering and leaving the pop-up.
 */
export function AnchoredPopup({
  anchor,
  onPointerInsideChange,
  children,
}: {
  anchor: Element | null;
  onPointerInsideChange?: (isInside: boolean) => void;
  children: ReactNode;
}) {
  const rect = useAnchorRect(anchor);
  const placement = rect && placeAtAnchor(rect, window.innerHeight);
  const style: CSSProperties | undefined = placement
    ? {
        top: placement.top,
        bottom: placement.bottom,
        // Centred on the word, as far as the viewport allows.
        left: `clamp(0.5rem, ${placement.centerX}px - min(13rem, 50vw - 0.5rem), 100vw - min(26rem, 100vw - 1rem) - 0.5rem)`,
      }
    : undefined;
  return (
    <div
      onPointerEnter={() => onPointerInsideChange?.(true)}
      onPointerLeave={() => onPointerInsideChange?.(false)}
      data-side={placement?.side}
      style={style}
      className={clsx(
        placement
          ? "pointer-events-none fixed z-30 flex w-[min(26rem,calc(100vw-1rem))] flex-col *:pointer-events-auto"
          : "fixed inset-x-2 top-16 bottom-2 z-30 flex items-end justify-center md:absolute md:inset-x-auto md:top-auto md:bottom-28 md:left-1/2 md:-translate-x-1/2",
        placement?.side === "above" && "justify-end",
        placement?.side === "below" && "justify-start",
      )}
    >
      {children}
    </div>
  );
}
