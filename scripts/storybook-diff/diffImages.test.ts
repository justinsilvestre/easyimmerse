import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PNG } from "pngjs";

import { diffImages, padImage } from "./diffImages.ts";

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
