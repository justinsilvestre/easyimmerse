import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CapturedStory } from "./captureManifest.ts";
import { renderErrors } from "./renderErrors.ts";

function story(name: string, error?: string): CapturedStory {
  const base = { id: name, title: "Components/Thing", name, importPath: "./x" };
  return error === undefined ? base : { ...base, error };
}

describe("renderErrors", () => {
  it("lists each story that failed to render with its error", () => {
    const manifest = {
      variants: [],
      stories: [story("Fine"), story("Broken", "boom")],
    };
    assert.deepEqual(renderErrors(manifest), [
      "Components/Thing / Broken: boom",
    ]);
  });
});
