import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export interface ImageDiff {
  pixelsChanged: number;
  /** The changed pixels in red on a transparent background, to lay over either screenshot. */
  diff: PNG;
  /** The rectangle around the changes, or null when nothing changed. */
  area: Area | null;
}

/** A rectangle in a screenshot, from its top left corner. */
export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Counts the pixels that differ between two screenshots and draws them.
 * Screenshots of different sizes are compared on a canvas of the larger size, so a story that grew or shrank counts every pixel outside the smaller image as changed.
 */
export function diffImages(before: PNG, after: PNG): ImageDiff {
  const width = Math.max(before.width, after.width);
  const height = Math.max(before.height, after.height);
  const first = padImage(before, width, height);
  const second = padImage(after, width, height);
  const diff = new PNG({ width, height });
  const pixelsChanged = pixelmatch(
    first.data,
    second.data,
    diff.data,
    width,
    height,
    {
      threshold: 0.1,
      diffMask: true,
    },
  );
  return {
    pixelsChanged,
    diff,
    area: changedArea(
      diff,
      Math.min(before.width, after.width),
      Math.min(before.height, after.height),
    ),
  };
}

/**
 * Finds the smallest rectangle around the changed pixels of a diff.
 * Only the part both screenshots cover is searched, so that a screenshot that grew or shrank, which marks every pixel
 * outside the smaller one as changed, gives the rectangle around what changed inside it instead of the full width.
 * When nothing changed there, the rectangle is the whole diff, since only the size changed.
 */
export function changedArea(
  diff: PNG,
  commonWidth: number,
  commonHeight: number,
): Area | null {
  let [left, top, right, bottom] = [Infinity, Infinity, -1, -1];
  for (let y = 0; y < commonHeight; y++) {
    for (let x = 0; x < commonWidth; x++) {
      if (diff.data[(y * diff.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right >= 0) {
    return {
      x: left,
      y: top,
      width: right - left + 1,
      height: bottom - top + 1,
    };
  }
  const resized = commonWidth < diff.width || commonHeight < diff.height;
  return resized
    ? { x: 0, y: 0, width: diff.width, height: diff.height }
    : null;
}

/** Copies the image onto a transparent canvas of the given size. */
export function padImage(image: PNG, width: number, height: number): PNG {
  if (image.width === width && image.height === height) return image;
  const padded = new PNG({ width, height });
  PNG.bitblt(image, padded, 0, 0, image.width, image.height, 0, 0);
  return padded;
}
