import { actions, selectPlaybackPosition } from "@easyimmerse/state";
import { act, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { useResumePlayback } from "./useResumePlayback.ts";

afterEach(cleanup);

function ResumeProbe() {
  useResumePlayback("m1");
  return null;
}

/** Renders the probe over a store whose preferences hold the given position for the file, and loads the file into the player. */
async function renderResuming(storedMs: number | null) {
  const rendered = renderWithAppStore(<ResumeProbe />, undefined, {
    storedPreferences:
      storedMs === null ? {} : { "playbackPosition:m1": String(storedMs) },
  });
  const { store } = rendered;
  act(() => {
    store.dispatch(actions.openMediaFileRequested("p1", "m1"));
    store.dispatch(actions.playerDurationChanged(600));
  });
  await vi.waitFor(() =>
    expect(selectPlaybackPosition("m1")(store.getState())).not.toBeUndefined(),
  );
  return rendered;
}

const seeks = (calls: readonly { type: string }[]) =>
  calls.filter((call) => call.type === "seekPlayer");

describe("useResumePlayback", () => {
  it("seeks to the stored position once the file has loaded", async () => {
    const { effects } = await renderResuming(90_000);
    expect(seeks(effects.calls)).toEqual([{ type: "seekPlayer", seconds: 90 }]);
  });

  it("starts a file never played from the beginning", async () => {
    const { effects } = await renderResuming(null);
    expect(seeks(effects.calls)).toEqual([]);
  });

  it("starts a file left near its end from the beginning", async () => {
    const { effects } = await renderResuming(598_000);
    expect(seeks(effects.calls)).toEqual([]);
  });

  it("seeks only once, not again when the duration is reported anew", async () => {
    const { store, effects } = await renderResuming(90_000);
    act(() => {
      store.dispatch(actions.playerDurationChanged(601));
    });
    expect(seeks(effects.calls)).toHaveLength(1);
  });
});
