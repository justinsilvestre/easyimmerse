import { create } from "qrcode";

/** A QR code drawn as one SVG path over a square grid, `size` modules wide, without the quiet zone. */
export type QrCodeDrawing = { size: number; path: string };

/** Draws the QR code of the text: one unit square per dark module. */
export function qrCodePath(text: string): QrCodeDrawing {
  const { size, data } = create(text, { errorCorrectionLevel: "M" }).modules;
  const squares: string[] = [];
  for (let row = 0; row < size; row++)
    for (let column = 0; column < size; column++)
      if (data[row * size + column]) squares.push(`M${column} ${row}h1v1h-1z`);
  return { size, path: squares.join("") };
}
