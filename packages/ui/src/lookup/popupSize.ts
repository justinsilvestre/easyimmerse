/** The dictionary pop-up's two sizes: its usual one, and a larger one that shows more of the entries. */
export type PopupSize = "compact" | "expanded";

/** The pop-up's width at each size, in rem, before a narrow screen narrows it. */
export const popupWidthRem: Record<PopupSize, number> = {
  compact: 32,
  expanded: 48,
};

/** The tallest the compact pop-up grows, in rem, before its entries scroll. */
const compactMaxHeightRem = 32;

/** The pop-up's width as CSS: the size's width, or the viewport's less a margin on a narrow screen. */
export function popupWidth(size: PopupSize): string {
  return `min(${popupWidthRem[size]}rem, 100vw - 1rem)`;
}

/** The left edge, as CSS, of a pop-up centred on a point of the viewport, as far as the viewport allows. */
export function popupLeft(size: PopupSize, centerX: number): string {
  const halfWidth = popupWidthRem[size] / 2;
  return `clamp(0.5rem, ${centerX}px - min(${halfWidth}rem, 50vw - 0.5rem), 100vw - ${popupWidth(size)} - 0.5rem)`;
}

/**
 * The pop-up's height as CSS properties, within the band it is placed in beside its word:
 * compact, as tall as its entries up to a limit; expanded, the whole band, so that expanding always shows.
 */
export function popupHeight(size: PopupSize): {
  height?: string;
  maxHeight: string;
} {
  return size === "expanded"
    ? { height: "100%", maxHeight: "100%" }
    : { maxHeight: `min(${compactMaxHeightRem}rem, 100%)` };
}
