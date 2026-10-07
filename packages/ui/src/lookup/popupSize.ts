/** The dictionary pop-up's two sizes: its usual one, and a larger one that shows more of the entries. */
export type PopupSize = "compact" | "expanded";

const widthRem: Record<PopupSize, number> = { compact: 26, expanded: 40 };

/** The pop-up's width as CSS: the size's width, or the viewport's less a margin on a narrow screen. */
export function popupWidth(size: PopupSize): string {
  return `min(${widthRem[size]}rem, 100vw - 1rem)`;
}

/** The left edge, as CSS, of a pop-up centred on a point of the viewport, as far as the viewport allows. */
export function popupLeft(size: PopupSize, centerX: number): string {
  const halfWidth = widthRem[size] / 2;
  return `clamp(0.5rem, ${centerX}px - min(${halfWidth}rem, 50vw - 0.5rem), 100vw - ${popupWidth(size)} - 0.5rem)`;
}
