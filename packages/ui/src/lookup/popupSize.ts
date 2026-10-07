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

/** The pop-up's width at a size, in CSS pixels at the page's current text size, before a narrow screen narrows it. */
export function popupWidthPx(size: PopupSize): number {
  const remPx = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return popupWidthRem[size] * (remPx || 16);
}

/**
 * The pop-up's height as CSS properties, within the band it is placed in:
 * compact, as tall as its entries up to a limit; expanded, the whole band, which spans the viewport's height.
 */
export function popupHeight(size: PopupSize): {
  height?: string;
  maxHeight: string;
} {
  return size === "expanded"
    ? { height: "100%", maxHeight: "100%" }
    : { maxHeight: `min(${compactMaxHeightRem}rem, 100%)` };
}
