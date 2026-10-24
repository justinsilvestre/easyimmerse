import type { ImageElement } from "@easyimmerse/types";

/** The size an image of structured content asks for, as CSS lengths, and its aspect ratio as height over width when it gives both. */
export type ImageLayout = {
  width?: string;
  height?: string;
  aspectRatio?: number;
};

/**
 * Reads the size of an image from structured content, in the units it asks for.
 * A monochrome image that gives no size is one em square, the size of the text it stands in for.
 */
export function imageLayout(image: ImageElement): ImageLayout {
  const unit = image.sizeUnits === "em" ? "em" : "px";
  const width = positive(image.width);
  const height = positive(image.height);
  if (width && height)
    return {
      width: `${width}${unit}`,
      height: `${height}${unit}`,
      aspectRatio: height / width,
    };
  if (!width && !height && image.appearance === "monochrome")
    return { width: "1em", height: "1em", aspectRatio: 1 };
  return {
    width: width === undefined ? undefined : `${width}${unit}`,
    height: height === undefined ? undefined : `${height}${unit}`,
  };
}

function positive(size: number | undefined): number | undefined {
  return size !== undefined && Number.isFinite(size) && size > 0
    ? size
    : undefined;
}
