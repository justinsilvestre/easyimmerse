import { describe, expect, it } from "vitest";
import { exampleTracksOneEach } from "../screen/mediaScreen/examplePlayback.ts";
import { cacheEntry } from "./cacheEntry.ts";
import { serverCacheWith } from "./serverCacheWith.ts";

const file = { projectId: "p1", mediaFileId: "m1" };

describe("cacheEntry", () => {
  it("returns the data stored for the query's arguments", () => {
    const slice = serverCacheWith("getMediaTracks", file, exampleTracksOneEach);
    expect(cacheEntry(slice, "getMediaTracks", file)?.data).toBe(
      exampleTracksOneEach,
    );
  });

  it("returns undefined for other arguments", () => {
    const slice = serverCacheWith("getMediaTracks", file, exampleTracksOneEach);
    const other = { projectId: "p1", mediaFileId: "m2" };
    expect(cacheEntry(slice, "getMediaTracks", other)).toBeUndefined();
  });
});
