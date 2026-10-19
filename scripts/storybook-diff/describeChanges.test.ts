import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StoryChange } from "./classifyStories.ts";
import { describeChanges } from "./describeChanges.ts";

function change(kind: StoryChange["kind"]): StoryChange {
  return {
    id: kind,
    title: "",
    name: "",
    importPath: "",
    kind,
    changedVariants: {},
  };
}

describe("describeChanges", () => {
  it("counts every kind of change", () => {
    const report = {
      variants: [],
      storyCount: 9,
      changes: [change("added"), change("changed"), change("changed")],
    };
    assert.equal(
      describeChanges(report),
      "2 changed, 1 added, 0 removed, 0 errored of 9 stories",
    );
  });
});
