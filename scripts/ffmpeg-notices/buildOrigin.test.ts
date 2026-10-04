import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeBuildOrigin } from "./buildOrigin.ts";

const url =
  "https://github.com/octo/repo/releases/download/ffmpeg-8.1.2/ffmpeg-8.1.2-aarch64-apple-darwin.tar.xz";
const rebuildUrl =
  "https://github.com/octo/repo/releases/download/ffmpeg-8.1.2-2/ffmpeg-8.1.2-x86_64-pc-windows-msvc.zip";

describe("describeBuildOrigin", () => {
  describe("for a build of the ffmpeg workflow", () => {
    it("reads the version from the tag", () => {
      assert.equal(describeBuildOrigin(url).version, "8.1.2");
    });

    it("links the release tarball as the source", () => {
      assert.equal(
        describeBuildOrigin(url).sourceUrl,
        "https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz",
      );
    });

    it("names the workflow and the tag as the builder", () => {
      assert.equal(
        describeBuildOrigin(url).builder,
        "Built by the ffmpeg workflow of https://github.com/octo/repo (.github/workflows/ffmpeg.yml) for the tag ffmpeg-8.1.2.",
      );
    });

    it("links the release", () => {
      assert.equal(
        describeBuildOrigin(url).releaseUrl,
        "https://github.com/octo/repo/releases/tag/ffmpeg-8.1.2",
      );
    });
  });

  describe("when the tag carries a rebuild number", () => {
    it("reads the version without the rebuild number", () => {
      assert.equal(describeBuildOrigin(rebuildUrl).version, "8.1.2");
    });

    it("links the release of the full tag", () => {
      assert.equal(
        describeBuildOrigin(rebuildUrl).releaseUrl,
        "https://github.com/octo/repo/releases/tag/ffmpeg-8.1.2-2",
      );
    });

    it("names the full tag as the builder's tag", () => {
      assert.match(
        describeBuildOrigin(rebuildUrl).builder,
        /for the tag ffmpeg-8\.1\.2-2\.$/,
      );
    });
  });

  it("throws for a URL of an older per-platform tag", () => {
    assert.throws(() =>
      describeBuildOrigin(
        "https://github.com/octo/repo/releases/download/ffmpeg-linux-8.1.3/ffmpeg-8.1.3-x86_64-unknown-linux-gnu.tar.xz",
      ),
    );
  });

  it("throws for a URL of unknown origin", () => {
    assert.throws(() => describeBuildOrigin("https://example.com/ffmpeg.zip"));
  });
});
