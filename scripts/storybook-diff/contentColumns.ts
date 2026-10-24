import type { PNG } from "pngjs";

/** A range of columns in a screenshot, from its left edge. */
export interface ColumnRange {
  x: number;
  width: number;
}

/** How much of the margin beside the content counts as content, so the shading stays clear of it. */
const keptMargin = 16;
/** Margins narrower than this share of the width are not worth shading. */
const minMarginShare = 0.1;

/**
 * Finds the columns that hold content in any of a variant's screenshots, so the report can shade the plain margins
 * beside a narrow layout in a wide viewport. Every screenshot is measured from the same left edge, as the report lays them out.
 * A pixel is margin when it matches the first pixel of its row, so a band of colour across the whole width is margin too.
 * Returns null when there is too little margin to shade.
 */
export function contentColumns(screenshots: PNG[]): ColumnRange | null {
  const fullWidth = Math.max(...screenshots.map((image) => image.width));
  const ranges = screenshots.map(usedColumns).filter((range) => range !== null);
  if (ranges.length === 0) return null;
  const left = Math.max(
    0,
    Math.min(...ranges.map(([first]) => first)) - keptMargin,
  );
  const right = Math.min(
    fullWidth - 1,
    Math.max(...ranges.map(([, last]) => last)) + keptMargin,
  );
  const width = right - left + 1;
  if (fullWidth - width < fullWidth * minMarginShare) return null;
  return { x: left, width };
}

/** The first and last columns with any pixel that is not margin, or null when the whole screenshot is margin. */
function usedColumns(image: PNG): [number, number] | null {
  const used = (x: number) => {
    for (let y = 0; y < image.height; y++) {
      const row = y * image.width * 4;
      if (
        image.data.readUInt32BE(row + x * 4) !== image.data.readUInt32BE(row)
      ) {
        return true;
      }
    }
    return false;
  };
  let first = 0;
  while (first < image.width && !used(first)) first++;
  if (first === image.width) return null;
  let last = image.width - 1;
  while (!used(last)) last--;
  return [first, last];
}
