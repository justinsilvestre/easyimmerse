import assert from "node:assert/strict";
import { mkdtempSync, readlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { linkFfmpegSidecars } from "./ffmpegLinks.ts";

function createSidecarDir(names: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "sidecars-"));
  for (const name of names) writeFileSync(join(dir, name), "");
  return dir;
}

describe("linkFfmpegSidecars", () => {
  it("links each sidecar under its plain name", () => {
    const sidecarDir = createSidecarDir(["ffmpeg-t", "ffprobe-t"]);
    const linkDir = join(sidecarDir, "links");
    linkFfmpegSidecars(sidecarDir, linkDir, "t");
    assert.equal(
      readlinkSync(join(linkDir, "ffprobe")),
      join(sidecarDir, "ffprobe-t"),
    );
  });

  it("replaces a link left by an earlier run", () => {
    const sidecarDir = createSidecarDir(["ffmpeg-t", "ffprobe-t"]);
    const linkDir = join(sidecarDir, "links");
    linkFfmpegSidecars(sidecarDir, linkDir, "t");
    assert.deepEqual(linkFfmpegSidecars(sidecarDir, linkDir, "t"), []);
  });

  it("returns the missing sidecars", () => {
    const sidecarDir = createSidecarDir(["ffmpeg-t"]);
    const missing = linkFfmpegSidecars(sidecarDir, join(sidecarDir, "l"), "t");
    assert.deepEqual(missing, [join(sidecarDir, "ffprobe-t")]);
  });
});
