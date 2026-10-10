import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import type { MediaRoute } from "../../route/route.ts";
import { picturesFoundBy, picturesProbeOf } from "./picturesProbe.ts";

const route: MediaRoute = {
  screen: "media",
  projectId: "p1",
  mediaFileId: "m1",
};

const browserFile = (name: string): MediaFile => ({
  id: "m1",
  project_id: "p1",
  name,
  source: { kind: "browser_file", size: 1, last_modified_ms: 1 },
  created_at_ms: 1,
  track_selection_json: null,
  origin: null,
});

const listed = (file: MediaFile) =>
  actions.requestSettled(
    "media/m1/mediaFile",
    { kind: "listMediaFiles", projectId: "p1" },
    { ok: true, data: { media_files: [file] } },
  );

const probed = (hasPictures: boolean) =>
  actions.requestSettled(
    "media/m1/pictures",
    {
      kind: "probePictures",
      file: { name: "clip.mp4", source: browserFile("clip.mp4").source },
    },
    { ok: true, data: hasPictures },
  );

describe("picturesProbeOf", () => {
  it("asks whether a video the browser holds shows pictures once its record arrives", () => {
    expect(picturesProbeOf(listed(browserFile("clip.mp4")), { route })).toEqual(
      [
        {
          type: "sendRequest",
          id: "media/m1/pictures",
          request: {
            kind: "probePictures",
            file: { name: "clip.mp4", source: browserFile("clip.mp4").source },
          },
        },
      ],
    );
  });

  it("asks nothing for a sound file", () => {
    expect(picturesProbeOf(listed(browserFile("song.mp3")), { route })).toEqual(
      [],
    );
  });

  it("asks nothing for a book", () => {
    expect(
      picturesProbeOf(listed(browserFile("book.epub")), { route }),
    ).toEqual([]);
  });
});

/** No server is connected, as in the app's initial state. */
const server = { config: null };

describe("picturesFoundBy", () => {
  it("finds pictures once the probe finds them", () => {
    expect(picturesFoundBy(probed(true), { route, server })).toBe(true);
  });

  it("finds none once the probe finds none", () => {
    expect(picturesFoundBy(probed(false), { route, server })).toBe(false);
  });
});
