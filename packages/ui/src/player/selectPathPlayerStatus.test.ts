import {
  actions,
  selectOpenMethodEntry,
  selectOpenTracksEntry,
} from "@easyimmerse/state";
import { describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { selectPathPlayerStatus } from "./selectPathPlayerStatus.ts";

/** Opens m1, which plays directly, and waits until its playback method is in the cache. */
async function storeWithMethod() {
  const client = createFakeBackendClient(
    fixtureResponses,
    directPlaybackRoutes,
  );
  const { store } = createTestAppStore(client, fakeServer);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  await vi.waitFor(() =>
    expect(selectPathPlayerStatus(store.getState()).status).toBe("ready"),
  );
  return store;
}

describe("selectPathPlayerStatus", () => {
  it("is loading outside the media screen", () => {
    const { store } = createTestAppStore();
    expect(selectPathPlayerStatus(store.getState()).status).toBe("loading");
  });

  it("plays the file's stream once its playback method has arrived", async () => {
    const store = await storeWithMethod();
    expect(selectPathPlayerStatus(store.getState())).toMatchObject({
      source: { kind: "direct" },
    });
  });

  it("keeps its answer while the player's time moves", async () => {
    const store = await storeWithMethod();
    const before = selectPathPlayerStatus(store.getState());
    store.dispatch(actions.playerTimeChanged(3));
    expect(selectPathPlayerStatus(store.getState())).toBe(before);
  });

  it("reads the tracks' cache entry by the same reference while the player's time moves", async () => {
    const store = await storeWithMethod();
    const before = selectOpenTracksEntry(store.getState());
    store.dispatch(actions.playerTimeChanged(3));
    expect(selectOpenTracksEntry(store.getState())).toBe(before);
  });

  it("reads the playback method's cache entry by the same reference while the player's time moves", async () => {
    const store = await storeWithMethod();
    const before = selectOpenMethodEntry(store.getState());
    store.dispatch(actions.playerTimeChanged(3));
    expect(selectOpenMethodEntry(store.getState())).toBe(before);
  });
});
