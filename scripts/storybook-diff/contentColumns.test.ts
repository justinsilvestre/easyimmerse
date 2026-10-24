import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PNG } from "pngjs";

import { contentColumns } from "./contentColumns.ts";

/** A white image with a black block over the given columns, on every row from `top` down. */
function page(width: number, columns: [number, number], top = 0): PNG {
  const image = new PNG({ width, height: 4 });
  image.data.fill(255);
  for (let y = top; y < image.height; y++) {
    for (let x = columns[0]; x <= columns[1]; x++) {
      image.data.fill(0, (y * width + x) * 4, (y * width + x) * 4 + 3);
    }
  }
  return image;
}

describe("contentColumns", () => {
  it("finds a centred column, with some of the margin on each side", () => {
    assert.deepEqual(contentColumns([page(200, [80, 119])]), {
      x: 64,
      width: 72,
    });
  });

  it("spans the content of every screenshot", () => {
    assert.deepEqual(
      contentColumns([page(200, [80, 99]), page(200, [100, 119], 2)]),
      { x: 64, width: 72 },
    );
  });

  it("finds no margin when the content nearly fills the width", () => {
    assert.equal(contentColumns([page(200, [10, 189])]), null);
  });

  it("finds no content in a blank screenshot", () => {
    assert.equal(contentColumns([page(200, [0, -1])]), null);
  });

  it("treats a full-width band of colour as margin", () => {
    const image = page(200, [80, 119]);
    image.data.fill(0, 0, 200 * 4);
    assert.deepEqual(contentColumns([image]), { x: 64, width: 72 });
  });
});
