import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { captureVariants } from "./captureVariants.ts";
import type { StoryChange } from "./classifyStories.ts";
import { shownFileNames } from "./shownFileNames.ts";

function change(
  kind: StoryChange["kind"],
  changedVariants: Record<string, number> = {},
): StoryChange {
  return {
    id: "a",
    title: "Thing",
    name: "a",
    importPath: "./x",
    kind,
    changedVariants,
  };
}

describe("shownFileNames", () => {
  it("shows a changed viewport in every theme", () => {
    const shown = shownFileNames(
      change("changed", { "dark-phone.png": 3 }),
      captureVariants,
    );
    assert.deepEqual(shown, ["light-phone.png", "dark-phone.png"]);
  });

  it("shows every variant of a story that changed only by being fixed", () => {
    assert.equal(shownFileNames(change("changed"), captureVariants).length, 4);
  });

  it("shows every variant of an added story", () => {
    assert.equal(shownFileNames(change("added"), captureVariants).length, 4);
  });
});
