/** How a chapter is cut into pages: one or two columns of text per page. */
export type PageLayout = {
  columns: 1 | 2;
  columnWidth: number;
  gap: number;
  pageWidth: number;
  /** The distance from the start of one page to the start of the next. */
  stride: number;
};

/**
 * Fits columns of at most `maxColumnWidth` into the available width. Two columns are shown
 * side by side, like an open book, once each can be nearly as wide as one would be alone.
 */
export function pageLayoutOf(
  availableWidth: number,
  maxColumnWidth: number,
  gap: number,
): PageLayout {
  const fitsTwo = availableWidth >= 1.7 * maxColumnWidth + gap;
  const columns = fitsTwo ? 2 : 1;
  const columnWidth = Math.floor(
    Math.min(maxColumnWidth, (availableWidth - (columns - 1) * gap) / columns),
  );
  const pageWidth = columns * columnWidth + (columns - 1) * gap;
  return { columns, columnWidth, gap, pageWidth, stride: pageWidth + gap };
}

/** The page on which something starting `x` pixels from the start of the first page lies. */
export function pageAt(x: number, stride: number): number {
  return Math.max(0, Math.floor((x + 1) / stride));
}
