import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { listStories } from "./storyIndex.ts";

const story = {
  type: "story",
  id: "components-button--primary",
  title: "Components/Button",
  name: "Primary",
  importPath: "./src/components/Button.stories.tsx",
  tags: ["dev"],
};
const docs = { ...story, type: "docs", id: "components-button--docs" };

describe("listStories", () => {
  it("keeps only the fields the tool uses", () => {
    const stories = listStories({ v: 5, entries: { [story.id]: story } });
    assert.deepEqual(stories, [
      {
        id: story.id,
        title: story.title,
        name: story.name,
        importPath: story.importPath,
      },
    ]);
  });

  it("leaves out docs pages", () => {
    const entries = { [docs.id]: docs, [story.id]: story };
    const stories = listStories({ v: 5, entries });
    assert.deepEqual(
      stories.map((entry) => entry.id),
      [story.id],
    );
  });

  it("rejects an index version it does not know", () => {
    assert.throws(() => listStories({ v: 4, entries: {} }), /version 4/);
  });
});
