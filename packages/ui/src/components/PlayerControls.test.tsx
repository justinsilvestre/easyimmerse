import { resetBackend } from "@easyimmerse/backend";
import type { AppAction, AppStore } from "@easyimmerse/state";
import { actions, selectSubtitles } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { stubRequestFullscreen } from "../testSupport/stubMediaElement.ts";
import { PlayerControls } from "./PlayerControls.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderControls(
  cues: readonly Cue[] | null = fixtureTrack.cues,
  fullscreenTarget: HTMLElement | null = null,
) {
  return renderWithAppStore(
    <PlayerControls
      cues={cues}
      fullscreenTarget={{ current: fullscreenTarget }}
    />,
  );
}

function dispatchAll(store: AppStore, ...storeActions: AppAction[]) {
  act(() => {
    for (const action of storeActions) store.dispatch(action);
  });
}

const findButton = (name: string | RegExp) =>
  screen.getByRole("button", { name });

describe("PlayerControls", () => {
  it("requests play when the play button is clicked", () => {
    const { effects } = renderControls();
    fireEvent.click(findButton("Play"));
    expect(effects.calls).toContainEqual({ type: "playPlayer" });
  });

  it("offers pausing while the media plays", () => {
    const { store } = renderControls();
    dispatchAll(store, actions.playerPlayingChanged(true));
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeNull();
  });

  it("requests a seek to the position chosen on the seek slider", () => {
    const { effects, store } = renderControls();
    dispatchAll(store, actions.playerDurationKnown(5000));
    fireEvent.change(screen.getByRole("slider", { name: "Seek" }), {
      target: { value: "2500" },
    });
    expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 2500 });
  });

  it("shows the current time and the duration", () => {
    const { store } = renderControls();
    dispatchAll(
      store,
      actions.playerDurationKnown(65_000),
      actions.playerTimeChanged(1800),
    );
    expect(screen.getByText("0:01 / 1:05")).toBeDefined();
  });

  describe("with cues", () => {
    it("skips to the start of the next cue", () => {
      const { effects, store } = renderControls();
      dispatchAll(store, actions.playerTimeChanged(600));
      fireEvent.click(findButton("Next cue"));
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 1750 });
    });

    it("skips to the start of the previous cue", () => {
      const { effects, store } = renderControls();
      dispatchAll(store, actions.playerTimeChanged(3300));
      fireEvent.click(findButton("Previous cue"));
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 1750 });
    });

    it("skips forward five seconds after the last cue has started", () => {
      const { effects, store } = renderControls();
      dispatchAll(store, actions.playerTimeChanged(4500));
      fireEvent.click(findButton("Next cue"));
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 9500 });
    });
  });

  describe("without cues", () => {
    it("skips forward five seconds", () => {
      const { effects, store } = renderControls(null);
      dispatchAll(store, actions.playerTimeChanged(1000));
      fireEvent.click(findButton("Forward 5 seconds"));
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 6000 });
    });

    it("skips back five seconds", () => {
      const { effects, store } = renderControls(null);
      dispatchAll(store, actions.playerTimeChanged(8000));
      fireEvent.click(findButton("Back 5 seconds"));
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 3000 });
    });
  });

  it("sets the volume chosen on the volume slider", () => {
    const { effects } = renderControls();
    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), {
      target: { value: "0.5" },
    });
    expect(effects.calls).toContainEqual({ type: "setVolume", volume: 0.5 });
  });

  it("sets the playback speed chosen in the speed menu", () => {
    const { effects } = renderControls();
    fireEvent.change(screen.getByRole("combobox", { name: "Playback speed" }), {
      target: { value: "1.5" },
    });
    expect(effects.calls).toContainEqual({
      type: "setPlaybackRate",
      rate: 1.5,
    });
  });

  it("names the overlaid subtitles in the overlay button", () => {
    renderControls();
    expect(findButton(/Overlaid subtitles/).textContent).toBe("Target");
  });

  it("switches the overlaid subtitles to the translation", () => {
    const { store } = renderControls();
    fireEvent.click(findButton(/Overlaid subtitles/));
    expect(selectSubtitles(store.getState()).overlay).toBe("translation");
  });

  it("closes the subtitles panel", () => {
    const { store } = renderControls();
    fireEvent.click(findButton("Subtitles panel"));
    expect(selectSubtitles(store.getState()).panelOpen).toBe(false);
  });

  it("requests fullscreen for the target", () => {
    const { requestFullscreen, restore } = stubRequestFullscreen();
    renderControls(fixtureTrack.cues, document.createElement("div"));
    fireEvent.click(findButton("Enter fullscreen"));
    restore();
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });

  describe("while a loop is set", () => {
    it("shows the looped range", () => {
      const { store } = renderControls();
      dispatchAll(
        store,
        actions.loopRequested({ start_ms: 1750, end_ms: 3000 }),
      );
      expect(findButton(/Stop repeating/).textContent).toContain("0:01–0:03");
    });

    it("stops repeating when the loop is clicked", () => {
      const { effects, store } = renderControls();
      dispatchAll(
        store,
        actions.loopRequested({ start_ms: 1750, end_ms: 3000 }),
      );
      fireEvent.click(findButton(/Stop repeating/));
      expect(effects.calls).toContainEqual({
        type: "setPlayerLoop",
        range: null,
      });
    });
  });
});
