import { actions } from "@easyimmerse/state";
import { describe, expect, it, vi } from "vitest";
import type { FakeRoute } from "../testSupport/createFakeBackendClient.ts";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import {
  copyPlaybackRoutes,
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { selectCanChooseTracks } from "./selectCanChooseTracks.ts";

/** Opens m1 with the given routes and waits until its tracks are in the cache. */
async function storeWithTracks(routes: readonly FakeRoute[]) {
  const client = createFakeBackendClient(fixtureResponses, routes);
  const { store } = createTestAppStore(client, fakeServer);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  await vi.waitFor(() =>
    expect(
      client.requests.some((request) => request.path.endsWith("/tracks")),
    ).toBe(true),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  return store;
}

describe("selectCanChooseTracks", () => {
  it("is true for a file with several tracks of a kind", async () => {
    const store = await storeWithTracks(copyPlaybackRoutes);
    expect(selectCanChooseTracks(store.getState())).toBe(true);
  });

  it("is false for a file with one track of each kind", async () => {
    const store = await storeWithTracks(directPlaybackRoutes);
    expect(selectCanChooseTracks(store.getState())).toBe(false);
  });

  it("is false outside the media screen", () => {
    const { store } = createTestAppStore();
    expect(selectCanChooseTracks(store.getState())).toBe(false);
  });
});
