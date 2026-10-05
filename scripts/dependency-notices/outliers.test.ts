import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findOutliers, findUnacceptedOutliers } from "./outliers.ts";

const data = {
  texts: [],
  groups: [
    {
      title: "Rust crates",
      packages: [
        { name: "cat", license: "MIT" },
        { name: "copyleft", license: "GPL-3.0-only" },
      ].map((found) => ({
        ...found,
        version: "1.0.0",
        usedIn: [],
        source: null,
        usesStandardTexts: false,
        files: [],
      })),
    },
  ],
};

describe("findOutliers", () => {
  it("lists the packages whose license is outside the allowed list", () => {
    assert.deepEqual(
      findOutliers(data).map((outlier) => outlier.name),
      ["copyleft"],
    );
  });
});

describe("findUnacceptedOutliers", () => {
  it("leaves out an outlier that an accepted entry covers", () => {
    const accepted = [
      {
        group: "Rust crates",
        name: "copyleft",
        license: "GPL-3.0-only",
        reason: "reviewed",
      },
    ];
    assert.deepEqual(findUnacceptedOutliers(findOutliers(data), accepted), []);
  });

  it("keeps an outlier whose license changed since it was accepted", () => {
    const accepted = [
      {
        group: "Rust crates",
        name: "copyleft",
        license: "MIT",
        reason: "reviewed",
      },
    ];
    assert.equal(
      findUnacceptedOutliers(findOutliers(data), accepted).length,
      1,
    );
  });
});
