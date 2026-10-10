import type { BackendRequest } from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { describe, expect, it, vi } from "vitest";
import { createFakeBackendClient } from "../../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import { selectWaveformWindows } from "./selectWaveformWindows.ts";

const view = {
  viewStartMs: 0,
  viewEndMs: 60_000,
  focusMs: 10_000,
  durationMs: 600_000,
};

/** A store whose server answers each window with the given peaks, after the player view above has requested its windows. */
function storeWithWindows(peaks: readonly number[]) {
  const client = createFakeBackendClient({}, [
    [
      "GET",
      /\/waveform$/,
      (request: BackendRequest) => ({
        start_ms: Number(request.query?.start_ms),
        peaks,
      }),
    ],
  ]);
  const { store } = createTestAppStore(client);
  store.dispatch(actions.openMediaFileRequested("p1", "m1"));
  store.dispatch(actions.waveformViewChanged("player", view));
  return store;
}

const windowStarts = (store: ReturnType<typeof storeWithWindows>) => [
  ...selectWaveformWindows(store.getState(), "player").keys(),
];

describe("selectWaveformWindows", () => {
  it("selects the peaks of the windows that have loaded", async () => {
    const store = storeWithWindows([10, 20]);
    await vi.waitFor(() =>
      expect(windowStarts(store)).toEqual([0, 30_000, 60_000]),
    );
  });

  it("leaves out windows the server found no peaks for", async () => {
    const store = storeWithWindows([]);
    await vi.waitFor(() =>
      expect(store.getState().app.screen.main).toMatchObject({
        waveform: { player: { requests: { 0: { status: "loaded" } } } },
      }),
    );
    expect(windowStarts(store)).toEqual([]);
  });

  it("selects nothing while no media screen is open", () => {
    const { store } = createTestAppStore();
    expect(selectWaveformWindows(store.getState(), "player").size).toBe(0);
  });
});
