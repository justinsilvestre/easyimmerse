/** Sizes the canvas's bitmap to the device's pixels, so that edges drawn on whole pixels stay sharp, and clears it. */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  size: { widthPx: number; heightPx: number },
): number {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(size.widthPx * ratio);
  canvas.height = Math.round(size.heightPx * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ratio;
}
