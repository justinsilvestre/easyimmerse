import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatInstallStamp, isInstalled } from "./installStamp.ts";
import type { ManifestEntry } from "./manifest.ts";

function entry(release: string, sha256: string): ManifestEntry {
  return {
    release,
    url: "https://example.com/ffmpeg.tar.xz",
    sha256,
    archive: "tar.xz",
    paths: { ffmpeg: "ffmpeg", ffprobe: "ffprobe" },
  };
}

const pinned = entry("ffmpeg-8.1.3-3", "abc");

describe("formatInstallStamp", () => {
  it("records the release and the archive hash as JSON", () => {
    assert.deepEqual(JSON.parse(formatInstallStamp(pinned)), {
      release: "ffmpeg-8.1.3-3",
      sha256: "abc",
    });
  });
});

describe("isInstalled", () => {
  it("accepts a stamp written for the same entry", () => {
    assert.equal(isInstalled(pinned, formatInstallStamp(pinned)), true);
  });

  it("rejects a missing stamp", () => {
    assert.equal(isInstalled(pinned, null), false);
  });

  it("rejects a stamp from another release", () => {
    const stamp = formatInstallStamp(entry("ffmpeg-8.1.3-2", "abc"));
    assert.equal(isInstalled(pinned, stamp), false);
  });

  it("rejects a stamp with another archive hash", () => {
    const stamp = formatInstallStamp(entry("ffmpeg-8.1.3-3", "def"));
    assert.equal(isInstalled(pinned, stamp), false);
  });

  it("rejects a stamp that is not JSON", () => {
    assert.equal(isInstalled(pinned, "ffmpeg-8.1.3-3"), false);
  });
});
