import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeBuildOrigin } from "./buildOrigin.ts";

const btbnUrl =
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-09-29-13-10/ffmpeg-n8.1.3-6-gff48edd8b2-linux64-lgpl-8.1.tar.xz";
const btbnTagUrl =
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-09-29-13-10/ffmpeg-n8.1.3-linux64-lgpl-8.1.tar.xz";
const ownUrl =
  "https://github.com/octo/repo/releases/download/ffmpeg-macos-8.1.2/ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz";
const ownRebuildUrl =
  "https://github.com/octo/repo/releases/download/ffmpeg-macos-8.1.2-2/ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz";

describe("describeBuildOrigin", () => {
  describe("for a BtbN autobuild", () => {
    it("reads the git describe version", () => {
      assert.equal(
        describeBuildOrigin(btbnUrl).version,
        "n8.1.3-6-gff48edd8b2",
      );
    });

    it("links the FFmpeg commit as the source", () => {
      assert.equal(
        describeBuildOrigin(btbnUrl).sourceUrl,
        "https://github.com/FFmpeg/FFmpeg/commit/ff48edd8b2",
      );
    });

    it("links the release tarball when the build is a tagged release", () => {
      assert.equal(
        describeBuildOrigin(btbnTagUrl).sourceUrl,
        "https://ffmpeg.org/releases/ffmpeg-8.1.3.tar.xz",
      );
    });

    it("names the autobuild date", () => {
      assert.match(
        describeBuildOrigin(btbnUrl).builder,
        /autobuild of 2026-09-29 13:10 UTC/,
      );
    });
  });

  describe("for this repository's macOS build", () => {
    it("reads the version from the tag", () => {
      assert.equal(describeBuildOrigin(ownUrl).version, "8.1.2");
    });

    it("links the release tarball as the source", () => {
      assert.equal(
        describeBuildOrigin(ownUrl).sourceUrl,
        "https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz",
      );
    });

    it("links the release", () => {
      assert.equal(
        describeBuildOrigin(ownUrl).releaseUrl,
        "https://github.com/octo/repo/releases/tag/ffmpeg-macos-8.1.2",
      );
    });

    describe("when the tag carries a rebuild number", () => {
      it("reads the version without the rebuild number", () => {
        assert.equal(describeBuildOrigin(ownRebuildUrl).version, "8.1.2");
      });

      it("links the release of the full tag", () => {
        assert.equal(
          describeBuildOrigin(ownRebuildUrl).releaseUrl,
          "https://github.com/octo/repo/releases/tag/ffmpeg-macos-8.1.2-2",
        );
      });

      it("names the full tag as the builder's tag", () => {
        assert.match(
          describeBuildOrigin(ownRebuildUrl).builder,
          /for the tag ffmpeg-macos-8\.1\.2-2\.$/,
        );
      });
    });
  });

  it("throws for a URL of unknown origin", () => {
    assert.throws(() => describeBuildOrigin("https://example.com/ffmpeg.zip"));
  });
});
