import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../../server/serverCacheWith.ts";
import { exampleTracksOneEach } from "./examplePlayback.ts";
import { selectMediaDurationMs } from "./mediaDurationMs.ts";

const file = { projectId: "p1", mediaFileId: "m1" };
const probed = serverCacheWith("getMediaTracks", file, exampleTracksOneEach);

/** The root state with m1 open after the given actions, and the given cache. */
function rootWith(backend = probed, ...after: AppAction[]) {
  const opened = actions.openMediaFileRequested("p1", "m1");
  return { app: stateAfter(opened, ...after), backend };
}

describe("selectMediaDurationMs", () => {
  it("is the probed length before the player has loaded the file", () => {
    expect(selectMediaDurationMs(rootWith())).toBe(10_000);
  });

  it("is the player's length once it has loaded the file", () => {
    const root = rootWith(probed, actions.playerDurationChanged(12));
    expect(selectMediaDurationMs(root)).toBe(12_000);
  });

  it("is zero before the probe has answered", () => {
    expect(selectMediaDurationMs(rootWith(emptyServerCache))).toBe(0);
  });

  it("is zero outside the media screen", () => {
    const root = { app: stateAfter(), backend: probed };
    expect(selectMediaDurationMs(root)).toBe(0);
  });
});
