import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveManifestEntries, type Manifest } from "./manifest.ts";

function manifest(release: string, triple: string): Manifest {
  return { repository: "octo/repo", release, sha256: { [triple]: "abc" } };
}

describe("deriveManifestEntries", () => {
  describe("for a Linux triple", () => {
    const entry = () =>
      deriveManifestEntries(
        manifest("ffmpeg-8.1.3", "x86_64-unknown-linux-gnu"),
      )["x86_64-unknown-linux-gnu"];

    it("points at the tar.xz asset of the release", () => {
      assert.equal(
        entry()?.url,
        "https://github.com/octo/repo/releases/download/ffmpeg-8.1.3/ffmpeg-8.1.3-x86_64-unknown-linux-gnu.tar.xz",
      );
    });

    it("names the archive kind tar.xz", () => {
      assert.equal(entry()?.archive, "tar.xz");
    });

    it("finds the binaries by their bare names", () => {
      assert.deepEqual(entry()?.paths, {
        ffmpeg: "ffmpeg",
        ffprobe: "ffprobe",
      });
    });

    it("keeps the hash", () => {
      assert.equal(entry()?.sha256, "abc");
    });
  });

  describe("for a Windows triple", () => {
    const entry = () =>
      deriveManifestEntries(manifest("ffmpeg-8.1.3", "x86_64-pc-windows-msvc"))[
        "x86_64-pc-windows-msvc"
      ];

    it("points at the zip asset of the release", () => {
      assert.equal(
        entry()?.url,
        "https://github.com/octo/repo/releases/download/ffmpeg-8.1.3/ffmpeg-8.1.3-x86_64-pc-windows-msvc.zip",
      );
    });

    it("names the archive kind zip", () => {
      assert.equal(entry()?.archive, "zip");
    });

    it("finds the binaries with the .exe extension", () => {
      assert.deepEqual(entry()?.paths, {
        ffmpeg: "ffmpeg.exe",
        ffprobe: "ffprobe.exe",
      });
    });
  });

  describe("for a rebuild release", () => {
    it("names the asset with the version alone", () => {
      const entry = deriveManifestEntries(
        manifest("ffmpeg-8.1.3-2", "aarch64-apple-darwin"),
      )["aarch64-apple-darwin"];
      assert.equal(
        entry?.url,
        "https://github.com/octo/repo/releases/download/ffmpeg-8.1.3-2/ffmpeg-8.1.3-aarch64-apple-darwin.tar.xz",
      );
    });
  });

  it("throws for a release of another name", () => {
    assert.throws(() =>
      deriveManifestEntries(manifest("ffmpeg-linux-8.1.3", "t")),
    );
  });
});
