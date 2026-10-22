import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PNG } from "pngjs";

import { pngSize } from "./pngSize.ts";

describe("pngSize", () => {
  it("reads the width and height from the image header", () => {
    const image = PNG.sync.write(new PNG({ width: 7, height: 3 }));
    assert.deepEqual(pngSize(image), { width: 7, height: 3 });
  });
});
