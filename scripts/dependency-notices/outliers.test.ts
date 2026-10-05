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
        { name: "roots", license: "CDLA-Permissive-2.0" },
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
      ["roots"],
    );
  });
});

describe("findUnacceptedOutliers", () => {
  it("leaves out an outlier that an accepted entry covers", () => {
    const accepted = [
      {
        group: "Rust crates",
        name: "roots",
        license: "CDLA-Permissive-2.0",
        reason: "reviewed",
      },
    ];
    assert.deepEqual(findUnacceptedOutliers(findOutliers(data), accepted), []);
  });

  it("keeps an outlier whose license changed since it was accepted", () => {
    const accepted = [
      {
        group: "Rust crates",
        name: "roots",
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
