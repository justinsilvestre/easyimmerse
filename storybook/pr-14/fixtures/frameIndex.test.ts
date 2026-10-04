import { describe, expect, it } from "vitest";
import { decodeFrameIndex } from "./frameIndex.ts";

const WHITE = 235;
const BLACK = 16;

function drawFrameIndexRow(
  frameIndex: number,
  width: number,
  levels = { white: WHITE, black: BLACK },
): Uint8Array {
  const row = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    const bit = Math.floor((x * 16) / width);
    row[x] = (frameIndex >> bit) & 1 ? levels.white : levels.black;
  }
  return row;
}

describe("decodeFrameIndex", () => {
  it("reads zero from an all-black row", () => {
    expect(decodeFrameIndex(drawFrameIndexRow(0, 256), 256)).toBe(0);
  });

  it("reads the least significant bit from the leftmost column", () => {
    expect(decodeFrameIndex(drawFrameIndexRow(1, 256), 256)).toBe(1);
  });

  it("reads the most significant bit from the rightmost column", () => {
    expect(decodeFrameIndex(drawFrameIndexRow(0x8000, 256), 256)).toBe(0x8000);
  });

  it("reads a mixed pattern", () => {
    expect(decodeFrameIndex(drawFrameIndexRow(237, 256), 256)).toBe(237);
  });

  it("reads columns whose width is not a whole number of samples", () => {
    expect(decodeFrameIndex(drawFrameIndexRow(0xabcd, 320), 320)).toBe(0xabcd);
  });

  it("tolerates samples blurred by lossy encoding", () => {
    const row = drawFrameIndexRow(1234, 256, { white: 170, black: 90 });
    expect(decodeFrameIndex(row, 256)).toBe(1234);
  });
});
