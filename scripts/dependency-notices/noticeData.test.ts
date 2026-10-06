import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildNoticeData } from "./noticeData.ts";
import type { ShippedPackage } from "./shippedPackage.ts";

function shipped(name: string, ecosystem: "rust" | "npm"): ShippedPackage {
  return {
    ecosystem,
    name,
    version: "1.0.0",
    license: "MIT",
    repository: null,
    authors: [],
    directory: `/packages/${name}`,
    usedIn: new Set(["web app"]),
  };
}

const sameTexts = () => ({
  texts: [{ name: "LICENSE", text: "MIT text" }],
  usesStandardTexts: false,
});

describe("buildNoticeData", () => {
  it("stores a text that several packages ship once", () => {
    const data = buildNoticeData(
      [shipped("cat", "rust"), shipped("dog", "rust")],
      sameTexts,
    );
    assert.deepEqual(data.texts, ["MIT text"]);
  });

  it("groups the packages by ecosystem", () => {
    const data = buildNoticeData(
      [shipped("cat", "rust"), shipped("dog", "npm")],
      sameTexts,
    );
    assert.deepEqual(
      data.groups.map((group) => [
        group.title,
        group.packages.map((found) => found.name),
      ]),
      [
        ["Rust crates", ["cat"]],
        ["JavaScript packages", ["dog"]],
      ],
    );
  });
});
