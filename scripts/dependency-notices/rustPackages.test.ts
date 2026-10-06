import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type Metadata, walkNormalDependencies } from "./rustPackages.ts";

function cratePackage(name: string, source: string | null = "registry") {
  return {
    id: name,
    name,
    version: "1.0.0",
    license: "MIT",
    repository: null,
    authors: [],
    source,
    manifest_path: `/crates/${name}/Cargo.toml`,
  };
}

const normal = [{ kind: null }];
const metadata: Metadata = {
  packages: [
    cratePackage("app", null),
    cratePackage("serde"),
    cratePackage("cc"),
    cratePackage("tempfile"),
    cratePackage("itoa"),
  ],
  resolve: {
    nodes: [
      {
        id: "app",
        deps: [
          { pkg: "serde", dep_kinds: normal },
          { pkg: "cc", dep_kinds: [{ kind: "build" }] },
          { pkg: "tempfile", dep_kinds: [{ kind: "dev" }] },
        ],
      },
      { id: "serde", deps: [{ pkg: "itoa", dep_kinds: normal }] },
      { id: "cc", deps: [] },
      { id: "tempfile", deps: [] },
      { id: "itoa", deps: [] },
    ],
  },
};

describe("walkNormalDependencies", () => {
  it("follows normal dependencies and leaves out build and dev dependencies and the root", () => {
    assert.deepEqual(
      walkNormalDependencies(metadata, "app")
        .map((found) => found.name)
        .sort(),
      ["itoa", "serde"],
    );
  });

  it("throws for a crate outside the workspace", () => {
    assert.throws(() => walkNormalDependencies(metadata, "serde"));
  });
});
