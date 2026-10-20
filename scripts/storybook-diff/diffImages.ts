import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export interface ImageDiff {
  pixelsChanged: number;
  /** The changed pixels in red on a transparent background, to lay over either screenshot. */
  diff: PNG;
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
  return { pixelsChanged, diff };
}

/** Copies the image onto a transparent canvas of the given size. */
export function padImage(image: PNG, width: number, height: number): PNG {
  if (image.width === width && image.height === height) return image;
  const padded = new PNG({ width, height });
  PNG.bitblt(image, padded, 0, 0, image.width, image.height, 0, 0);
  return padded;
}
