import { describe, expect, it } from "vitest";
import { directoryOf, isFfmpegExecutable } from "./ffmpegExecutable.ts";

describe("directoryOf", () => {
  it("returns the directory of a slash-separated path", () => {
    expect(directoryOf("/opt/homebrew/bin/ffmpeg")).toBe("/opt/homebrew/bin");
  });

  it("returns the directory of a backslash-separated path", () => {
    expect(directoryOf("C:\\ffmpeg\\bin\\ffmpeg.exe")).toBe("C:\\ffmpeg\\bin");
  });

  it("keeps the root of a file directly in it", () => {
    expect(directoryOf("/ffmpeg")).toBe("/");
  });
});

describe("isFfmpegExecutable", () => {
  it("accepts a file named ffmpeg", () => {
    expect(isFfmpegExecutable("/usr/bin/ffmpeg")).toBe(true);
  });

  it("accepts ffmpeg.exe on Windows", () => {
    expect(isFfmpegExecutable("C:\\ffmpeg\\bin\\FFMPEG.EXE")).toBe(true);
  });

  it("refuses another program of the build", () => {
    expect(isFfmpegExecutable("/usr/bin/ffprobe")).toBe(false);
  });
});
