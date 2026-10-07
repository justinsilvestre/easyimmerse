import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { removeSidecarCopies } from "./sidecarCopies.ts";

const triple = "x86_64-apple-darwin";

function targetDirWith(files: string[]): string {
  const targetDir = mkdtempSync(join(tmpdir(), "sidecar-copies-"));
  for (const file of files) {
    mkdirSync(join(targetDir, file, ".."), { recursive: true });
    writeFileSync(join(targetDir, file), "");
  }
  return targetDir;
}

function remainingFiles(targetDir: string): string[] {
  return readdirSync(targetDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

describe("removeSidecarCopies", () => {
  it("removes the copies in the debug and release folders", () => {
    const targetDir = targetDirWith([
      "debug/easyimmerse-ffmpeg",
      "debug/easyimmerse-ffprobe",
      "release/easyimmerse-ffmpeg",
      "release/easyimmerse-ffprobe",
    ]);
    removeSidecarCopies(targetDir, triple);
    assert.deepEqual(remainingFiles(targetDir), []);
  });

  it("removes the Windows copies by their .exe names", () => {
    const targetDir = targetDirWith(["debug/easyimmerse-ffmpeg.exe"]);
    removeSidecarCopies(targetDir, "x86_64-pc-windows-msvc");
    assert.deepEqual(remainingFiles(targetDir), []);
  });

  it("leaves the other build outputs in place", () => {
    const targetDir = targetDirWith(["debug/easyimmerse-native"]);
    removeSidecarCopies(targetDir, triple);
    assert.deepEqual(remainingFiles(targetDir), ["easyimmerse-native"]);
  });

  it("returns the paths it removed", () => {
    const targetDir = targetDirWith(["debug/easyimmerse-ffmpeg"]);
    assert.deepEqual(removeSidecarCopies(targetDir, triple), [
      join(targetDir, "debug", "easyimmerse-ffmpeg"),
    ]);
  });
});
