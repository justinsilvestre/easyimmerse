/** Reads a PNG's dimensions from its header, which follows the 8-byte signature and the 8-byte chunk header. */
export function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
