import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseGitHubReleaseUrl } from "./githubReleaseAsset.ts";

describe("parseGitHubReleaseUrl", () => {
  it("splits a release download URL into its parts", () => {
    const parsed = parseGitHubReleaseUrl(
      "https://github.com/octo/repo/releases/download/ffmpeg-macos-8.1.2/ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz",
    );
    assert.deepEqual(parsed, {
      owner: "octo",
      repo: "repo",
      tag: "ffmpeg-macos-8.1.2",
      asset: "ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz",
    });
  });

  it("decodes percent-encoded tag and asset names", () => {
    const parsed = parseGitHubReleaseUrl(
      "https://github.com/octo/repo/releases/download/v1%2B2/a%20b.zip",
    );
    assert.deepEqual(
      { tag: parsed?.tag, asset: parsed?.asset },
      { tag: "v1+2", asset: "a b.zip" },
    );
  });

  it("returns null for a URL that is not a GitHub release download", () => {
    const parsed = parseGitHubReleaseUrl(
      "https://github.com/BtbN/FFmpeg-Builds/archive/refs/tags/latest.tar.gz",
    );
    assert.equal(parsed, null);
  });

  it("returns null for a release download on another host", () => {
    const parsed = parseGitHubReleaseUrl(
      "https://example.com/octo/repo/releases/download/v1/a.zip",
    );
    assert.equal(parsed, null);
  });
});
