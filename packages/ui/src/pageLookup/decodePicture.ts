/** How many device pixels an SVG picture gives each CSS pixel of its image, so that it stays sharp on high-density screens. */
const pixelRatio = 2;

/** The size, in CSS pixels, at which an SVG image without a size of its own is drawn. */
const fallbackSize = 128;

/**
 * Decodes an image file into a picture without giving it a URL the page could forbid, or resolves with null when the browser cannot decode it.
 * An SVG image, which `createImageBitmap` does not decode, is drawn through an image element at twice its own size instead.
 * In Chrome, a content script may load that element from an object URL whatever the page's Content Security Policy.
 */
export async function decodePicture(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob);
  } catch {
    return drawThroughImageElement(blob);
  }
}

async function drawThroughImageElement(
  blob: Blob,
): Promise<ImageBitmap | null> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return await createImageBitmap(canvasOf(image));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasOf(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = (image.naturalWidth || fallbackSize) * pixelRatio;
  canvas.height = (image.naturalHeight || fallbackSize) * pixelRatio;
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}
