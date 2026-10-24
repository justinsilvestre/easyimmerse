import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PNG } from "pngjs";

import { changedArea, diffImages, padImage } from "./diffImages.ts";

function solid(width: number, height: number, gray: number): PNG {
  const image = new PNG({ width, height });
  image.data.fill(gray);
  for (let index = 3; index < image.data.length; index += 4)
    image.data[index] = 255;
  return image;
}

describe("diffImages", () => {
  it("counts no pixels between identical images", () => {
    assert.equal(diffImages(solid(4, 4, 0), solid(4, 4, 0)).pixelsChanged, 0);
  });

  it("counts every pixel between black and white images", () => {
    assert.equal(
      diffImages(solid(4, 4, 0), solid(4, 4, 255)).pixelsChanged,
      16,
    );
  });

  it("counts the area outside the smaller image as changed", () => {
    assert.equal(diffImages(solid(4, 4, 0), solid(4, 6, 0)).pixelsChanged, 8);
  });
});

describe("padImage", () => {
  it("returns the image itself when the size already matches", () => {
    const image = solid(2, 2, 0);
    assert.equal(padImage(image, 2, 2), image);
  });

  it("keeps the original pixels at the top left", () => {
    const padded = padImage(solid(1, 1, 7), 2, 2);
    assert.deepEqual([...padded.data.subarray(0, 4)], [7, 7, 7, 255]);
  });
});

describe("changedArea", () => {
  /** A transparent diff with the given pixels marked as changed. */
  function diffWith(
    width: number,
    height: number,
    pixels: [number, number][],
  ): PNG {
    const diff = new PNG({ width, height });
    for (const [x, y] of pixels) diff.data[(y * width + x) * 4 + 3] = 255;
    return diff;
  }

  it("surrounds the changed pixels", () => {
    assert.deepEqual(
      changedArea(
        diffWith(10, 10, [
          [2, 3],
          [5, 7],
        ]),
        10,
        10,
      ),
      {
        x: 2,
        y: 3,
        width: 4,
        height: 5,
      },
    );
  });

  it("finds nothing in a diff without changes", () => {
    assert.equal(changedArea(diffWith(10, 10, []), 10, 10), null);
  });

  it("leaves out the rows only the taller screenshot has", () => {
    const pixels: [number, number][] = [[4, 2]];
    for (let x = 0; x < 10; x++) pixels.push([x, 8], [x, 9]);
    assert.deepEqual(changedArea(diffWith(10, 10, pixels), 10, 8), {
      x: 4,
      y: 2,
      width: 1,
      height: 1,
    });
  });

  it("covers the whole diff when only the size changed", () => {
    assert.deepEqual(changedArea(diffWith(10, 10, [[3, 9]]), 10, 8), {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
  });
});
