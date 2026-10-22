import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../../server/serverCacheWith.ts";
import { cachedHasPictures } from "./cachedPictures.ts";
import { exampleTracksOneEach } from "./examplePlayback.ts";

const server = { serverUrl: "http://localhost:4000", token: "test-token" };
const file = { projectId: "p1", mediaFileId: "m1" };
const video = exampleMediaFile("m1", "clip.mkv");
const soundOnly = {
  ...exampleTracksOneEach,
  container: {
    ...exampleTracksOneEach.container,
    tracks: exampleTracksOneEach.container.tracks.filter(
      ({ kind }) => kind !== "video",
    ),
  },
};

/** A file the browser holds, under the given name. */
const browserFile = (name: string): MediaFile => ({
  ...exampleMediaFile("m3", name),
  source: { kind: "browser_file", size: 1, last_modified_ms: 1 },
});

/** The cache after the browser's probe of the file answered. */
const probed = (mediaFile: MediaFile, hasPictures: boolean) =>
  serverCacheWith(
    "probePictures",
    { name: mediaFile.name, source: mediaFile.source },
    hasPictures,
  );

describe("cachedHasPictures", () => {
  describe("for a browser-added file whose copy the server keeps", () => {
    it("is true once the server has found a video track in it", () => {
      const stored = {
        ...browserFile("clip.mp4"),
        id: "m1",
        has_stored_copy: true,
      };
      const tracks = serverCacheWith(
        "getMediaTracks",
        file,
        exampleTracksOneEach,
      );
      expect(cachedHasPictures(tracks, server, stored)).toBe(true);
    });
  });

  describe("for a file on the server's disk", () => {
    it("is true once the server has found a video track in it", () => {
      const tracks = serverCacheWith(
        "getMediaTracks",
        file,
        exampleTracksOneEach,
      );
      expect(cachedHasPictures(tracks, server, video)).toBe(true);
    });

    it("is false when the server has found only sound tracks", () => {
      const tracks = serverCacheWith("getMediaTracks", file, soundOnly);
      expect(cachedHasPictures(tracks, server, video)).toBe(false);
    });

    it("is false while its tracks are not cached", () => {
      expect(cachedHasPictures(emptyServerCache, server, video)).toBe(false);
    });

    it("is false without a server", () => {
      const tracks = serverCacheWith(
        "getMediaTracks",
        file,
        exampleTracksOneEach,
      );
      expect(cachedHasPictures(tracks, null, video)).toBe(false);
    });
  });

  describe("for a file the browser holds", () => {
    const clip = browserFile("clip.mp4");

    it("is true once the browser's probe has found pictures", () => {
      expect(cachedHasPictures(probed(clip, true), null, clip)).toBe(true);
    });

    it("is false when the probe found none", () => {
      expect(cachedHasPictures(probed(clip, false), null, clip)).toBe(false);
    });

    it("is false while the probe has not answered", () => {
      expect(cachedHasPictures(emptyServerCache, null, clip)).toBe(false);
    });

    it("is false for a sound file's name", () => {
      const song = browserFile("song.mp3");
      expect(cachedHasPictures(probed(song, true), null, song)).toBe(false);
    });
  });
});
