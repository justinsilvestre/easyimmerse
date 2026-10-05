import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ManifestEntry } from "../fetch-ffmpeg/manifest.ts";
import { findManifestChanges, findStaleOutputs } from "./staleness.ts";

function manifestEntry(sha256: string): ManifestEntry {
  return {
    release: "ffmpeg-8.1.3",
    url: "https://example.com/ffmpeg.tar.xz",
    sha256,
    archive: "tar.xz",
    paths: { ffmpeg: "ffmpeg", ffprobe: "ffprobe" },
  };
}

function recordedBuild(sha256: string) {
  return {
    url: "https://example.com/ffmpeg.tar.xz",
    sha256,
    configuration: "",
  };
}

describe("findManifestChanges", () => {
  it("finds nothing when every hash matches", () => {
    const changes = findManifestChanges(
      { t: manifestEntry("a") },
      { t: recordedBuild("a") },
    );
    assert.deepEqual(changes, []);
  });

  it("reports a changed hash", () => {
    const changes = findManifestChanges(
      { t: manifestEntry("b") },
      { t: recordedBuild("a") },
    );
    assert.deepEqual(changes, [
      "t was recorded from a different archive than the manifest names",
    ]);
  });

  it("reports a triple added to the manifest", () => {
    const changes = findManifestChanges({ t: manifestEntry("a") }, {});
    assert.deepEqual(changes, ["t is in the manifest but not recorded"]);
  });

  it("reports a triple removed from the manifest", () => {
    const changes = findManifestChanges({}, { t: recordedBuild("a") });
    assert.deepEqual(changes, ["t is recorded but no longer in the manifest"]);
  });
});

describe("findStaleOutputs", () => {
  it("finds nothing when every file matches", () => {
    assert.deepEqual(findStaleOutputs({ f: "x" }, { f: "x" }), []);
  });

  it("reports a file whose content differs", () => {
    assert.deepEqual(findStaleOutputs({ f: "x" }, { f: "y" }), [
      "f is out of date",
    ]);
  });

  it("reports a missing file", () => {
    assert.deepEqual(findStaleOutputs({ f: "x" }, { f: null }), [
      "f is out of date",
    ]);
  });
});
