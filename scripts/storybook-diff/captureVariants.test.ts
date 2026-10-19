import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { captureVariants, variantFileName } from "./captureVariants.ts";

describe("captureVariants", () => {
  it("pairs every theme with every viewport", () => {
    const names = captureVariants.map(variantFileName);
    assert.deepEqual(names, [
      "light-phone.png",
      "light-desktop.png",
      "dark-phone.png",
      "dark-desktop.png",
    ]);
  });
});
