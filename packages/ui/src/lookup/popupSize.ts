/** The dictionary pop-up's two sizes: its usual one, and a larger one that shows more of the entries. */
export type PopupSize = "compact" | "expanded";

/** The pop-up's width at each size, in rem, before a narrow screen narrows it. */
export const popupWidthRem: Record<PopupSize, number> = {
  compact: 32,
  expanded: 48,
};

/** The tallest the compact pop-up grows, in rem, before its entries scroll. */
const compactMaxHeightRem = 32;

/**
 * The pop-up's width as CSS: the size's width, or the viewport's less a margin on a narrow screen.
 * With `remPx`, lengths in rem are written in pixels at that size of a rem, for a stylesheet that fixes it so; without it, in rem.
 */
export function popupWidth(size: PopupSize, remPx?: number): string {
  return `min(${remLength(popupWidthRem[size], remPx)}, 100vw - ${remLength(1, remPx)})`;
}

/** The pop-up's width at a size, in CSS pixels at the given size of a rem, by default the page's current text size, before a narrow screen narrows it. */
export function popupWidthPx(
  size: PopupSize,
  remPx: number = rootRemPx(),
): number {
  return popupWidthRem[size] * remPx;
}

/**
 * The pop-up's height as CSS properties, within the band it is placed in:
 * compact, as tall as its entries up to a limit; expanded, the whole band, which spans the viewport's height.
 * `remPx` works as it does for `popupWidth`.
 */
export function popupHeight(
  size: PopupSize,
  remPx?: number,
): {
  height?: string;
  maxHeight: string;
} {
  return size === "expanded"
    ? { height: "100%", maxHeight: "100%" }
    : { maxHeight: `min(${remLength(compactMaxHeightRem, remPx)}, 100%)` };
}

function remLength(rem: number, remPx: number | undefined): string {
  return remPx === undefined ? `${rem}rem` : `${rem * remPx}px`;
}

function rootRemPx(): number {
  const remPx = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return remPx || 16;
}
