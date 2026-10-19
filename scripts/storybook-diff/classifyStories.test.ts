import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CapturedStory, CaptureManifest } from "./captureManifest.ts";
import { classifyStories } from "./classifyStories.ts";

const variants = [
  { theme: "light" as const, viewport: { name: "phone", width: 1, height: 1 } },
];

function story(id: string, error?: string): CapturedStory {
  const base = { id, title: "Components/Thing", name: id, importPath: "./x" };
  return error === undefined ? base : { ...base, error };
}

function manifest(...stories: CapturedStory[]): CaptureManifest {
  return { variants, stories };
}

const identical = () => 0;
const differing = () => 12;

describe("classifyStories", () => {
  it("reports nothing when every screenshot matches", () => {
    const changes = classifyStories(
      manifest(story("a")),
      manifest(story("a")),
      identical,
    );
    assert.deepEqual(changes, []);
  });

  it("marks a story only in the later capture as added", () => {
    const changes = classifyStories(
      manifest(),
      manifest(story("a")),
      identical,
    );
    assert.equal(changes[0]?.kind, "added");
  });

  it("marks a story only in the earlier capture as removed", () => {
    const changes = classifyStories(
      manifest(story("a")),
      manifest(),
      identical,
    );
    assert.equal(changes[0]?.kind, "removed");
  });

  it("records the pixels that differ per variant", () => {
    const changes = classifyStories(
      manifest(story("a")),
      manifest(story("a")),
      differing,
    );
    assert.deepEqual(changes[0]?.changedVariants, { "light-phone.png": 12 });
  });

  it("marks a story that now fails to render as errored", () => {
    const changes = classifyStories(
      manifest(story("a")),
      manifest(story("a", "boom")),
      identical,
    );
    assert.equal(changes[0]?.kind, "errored");
  });

  it("marks a story that renders again as changed, with the earlier error", () => {
    const changes = classifyStories(
      manifest(story("a", "boom")),
      manifest(story("a")),
      () => null,
    );
    assert.deepEqual(
      changes.map((change) => [change.kind, change.errorBefore]),
      [["changed", "boom"]],
    );
  });

  it("lists removed stories after the others", () => {
    const changes = classifyStories(
      manifest(story("old")),
      manifest(story("new")),
      identical,
    );
    assert.deepEqual(
      changes.map((change) => change.id),
      ["new", "old"],
    );
  });
});
