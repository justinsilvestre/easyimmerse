import { describe, expect, it } from "vitest";
import { basename } from "./basename.ts";

describe("basename", () => {
  it("returns the file name of a unix path", () => {
    expect(basename("/home/me/episode.srt")).toBe("episode.srt");
  });

  it("returns the file name of a windows path", () => {
    expect(basename("C:\\Users\\me\\episode.srt")).toBe("episode.srt");
  });

  it("returns a bare file name unchanged", () => {
    expect(basename("episode.srt")).toBe("episode.srt");
  });
});
