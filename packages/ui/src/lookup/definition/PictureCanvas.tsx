import type { CSSProperties } from "react";

/**
 * Shows a decoded picture on a canvas, in place of an image element where a URL may not be loaded.
 * A `monochrome` picture is painted in the canvas's text color, keeping only its shape, as a mask would.
 */
export function PictureCanvas({
  picture,
  label,
  isMonochrome = false,
  className,
  style,
}: {
  picture: ImageBitmap;
  label?: string;
  isMonochrome?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <canvas
      // Drawn again on every render, so that a monochrome picture takes the text color of the theme shown.
      ref={(canvas) => {
        if (canvas) drawPicture(canvas, picture, isMonochrome);
      }}
      role="img"
      aria-label={label}
      width={picture.width}
      height={picture.height}
      className={className}
      style={style}
    />
  );
}

function drawPicture(
  canvas: HTMLCanvasElement,
  picture: ImageBitmap,
  isMonochrome: boolean,
): void {
  const context = canvas.getContext("2d");
  // A picture that has been closed has no size left, and cannot be drawn.
  if (context === null || picture.width === 0) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  context.drawImage(picture, 0, 0);
  if (!isMonochrome) return;
  context.globalCompositeOperation = "source-in";
  context.fillStyle = getComputedStyle(canvas).color;
  context.fillRect(0, 0, canvas.width, canvas.height);
}
