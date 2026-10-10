import { actions } from "@easyimmerse/state";
import { describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import {
  directPlaybackRoutes,
  fakeServer,
} from "../testSupport/mediaFixtureResponses.ts";
import { selectPathPlayerStatus } from "./selectPathPlayerStatus.ts";

/** Opens m1, which plays directly, and waits until its plan is in the cache. */
async function storeWithPlan() {
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

  it("plays the file's stream once its plan has arrived", async () => {
    const store = await storeWithPlan();
    expect(selectPathPlayerStatus(store.getState())).toMatchObject({
      source: { kind: "direct" },
    });
  });

  it("keeps its answer while the player's time moves", async () => {
    const store = await storeWithPlan();
    const before = selectPathPlayerStatus(store.getState());
    store.dispatch(actions.playerTimeChanged(3));
    expect(selectPathPlayerStatus(store.getState())).toBe(before);
  });
});
