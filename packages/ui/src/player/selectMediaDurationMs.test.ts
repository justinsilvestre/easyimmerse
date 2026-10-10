import { selectMediaTracksEntry } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { selectMediaDurationMs } from "./selectMediaDurationMs.ts";

/** Opens m1 and waits until its tracks are in the cache. */
async function storeWithTracks() {
  const client = createFakeBackendClient(
    fixtureResponses,
    directPlaybackRoutes,
  );
  const { store } = createTestAppStore(client, fakeServer);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  await vi.waitFor(() =>
    expect(
      selectMediaTracksEntry(store.getState(), {
        projectId: "p1",
        mediaFileId: "m1",
      })?.data,
    ).toBeDefined(),
  );
  return store;
}

describe("selectMediaDurationMs", () => {
  it("is the probed length before the player has loaded the file", async () => {
    const store = await storeWithTracks();
    expect(selectMediaDurationMs(store.getState())).toBe(10_000);
  });

  it("is the player's length once it has loaded the file", async () => {
    const store = await storeWithTracks();
    store.dispatch(actions.playerDurationChanged(12));
    expect(selectMediaDurationMs(store.getState())).toBe(12_000);
  });

  it("is zero outside the media screen", () => {
    const { store } = createTestAppStore();
    expect(selectMediaDurationMs(store.getState())).toBe(0);
  });
});
