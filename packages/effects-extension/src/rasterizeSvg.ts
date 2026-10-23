/** How many device pixels the PNG gives each CSS pixel of the SVG image, so that it stays sharp on high-density screens. */
const pixelRatio = 2;

/** The size, in CSS pixels, at which an SVG image without a size of its own is drawn. */
const fallbackSize = 128;

/**
 * Draws an SVG image into a PNG image at twice its own size.
 * It needs a document that may load the image from an object URL, such as the page Firefox runs a background script in.
 */
export async function rasterizeSvg(svg: Uint8Array): Promise<Uint8Array> {
  const blob = new Blob([svg as BlobPart], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await pngOf(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function pngOf(image: HTMLImageElement): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = (image.naturalWidth || fallbackSize) * pixelRatio;
  canvas.height = (image.naturalHeight || fallbackSize) * pixelRatio;
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const png = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (png === null) throw new Error("The SVG image could not be drawn.");
  return new Uint8Array(await png.arrayBuffer());
}
