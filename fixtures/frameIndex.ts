const BIT_COUNT = 16;
const THRESHOLD = 128;

/**
 * Reads the frame index that a conversion fixture draws into each frame.
 * The picture holds 16 equal-width columns, one per bit with the least significant bit on the left, white for 1 and black for 0.
 * Pass one row of luma (grayscale) samples and the picture width in samples.
 */
export function decodeFrameIndex(
  grayscaleRow: Uint8Array,
  width: number,
): number {
  let frameIndex = 0;
  for (let bit = 0; bit < BIT_COUNT; bit++) {
    if (isColumnWhite(grayscaleRow, columnCenter(bit, width)))
      frameIndex |= 1 << bit;
  }
  return frameIndex;
}

function columnCenter(bit: number, width: number): number {
  return Math.floor(((bit + 0.5) * width) / BIT_COUNT);
}

function isColumnWhite(grayscaleRow: Uint8Array, x: number): boolean {
  return (grayscaleRow[x] ?? 0) >= THRESHOLD;
}
