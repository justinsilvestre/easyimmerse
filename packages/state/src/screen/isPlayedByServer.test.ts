import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { isPlayedByServer } from "./isPlayedByServer.ts";

function browserFile(hasStoredCopy: boolean): MediaFile {
  return {
    ...exampleMediaFile("m1", "clip.mp4"),
    source: { kind: "browser_file", size: 10, last_modified_ms: 0 },
    has_stored_copy: hasStoredCopy,
  };
}

describe("isPlayedByServer", () => {
  it("is true for a file on the server's disk", () => {
    expect(isPlayedByServer(exampleMediaFile("m1", "clip.mp4"))).toBe(true);
  });

  it("is true for a browser-added file whose copy the server keeps", () => {
    expect(isPlayedByServer(browserFile(true))).toBe(true);
  });

  it("is false for a browser-added file the server keeps no copy of", () => {
    expect(isPlayedByServer(browserFile(false))).toBe(false);
  });
});
