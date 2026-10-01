import { describe, expect, it } from "vitest";
import { guessMediaKind } from "./guessMediaKind.ts";

describe("guessMediaKind", () => {
  it("recognizes a video file", () => {
    expect(guessMediaKind("episode.mkv")).toBe("video");
  });

  it("recognizes an audio file regardless of case", () => {
    expect(guessMediaKind("Chapter 1.MP3")).toBe("audio");
  });

  it("recognizes a document", () => {
    expect(guessMediaKind("novel.epub")).toBe("document");
  });

  it("goes by the last extension", () => {
    expect(guessMediaKind("episode.srt.mp4")).toBe("video");
  });

  it("returns null for an unknown extension", () => {
    expect(guessMediaKind("episode.srt")).toBeNull();
  });

  it("returns null for a name without an extension", () => {
    expect(guessMediaKind("README")).toBeNull();
  });

  it("returns null for an extension that names an object property", () => {
    expect(guessMediaKind("file.constructor")).toBeNull();
  });
});
