import { resetBackend } from "@easyimmerse/backend";
import type { AppAction, AppStore } from "@easyimmerse/state";
import { actions, selectSubtitles } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fixtureTrack } from "../testSupport/fixtureResponses.ts";
import { renderWithAppStore } from "../testSupport/renderWithAppStore.tsx";
import { stubRequestFullscreen } from "../testSupport/stubMediaElement.ts";
import { MediaView } from "./MediaView.tsx";

afterEach(() => {
  cleanup();
  resetBackend();
});

function renderView(
  kind: "video" | "audio" = "video",
  targetCues: readonly Cue[] | null = fixtureTrack.cues,
) {
  return renderWithAppStore(
    <MediaView
      kind={kind}
      src="/sample"
      targetCues={targetCues}
      translationCues={null}
      onWordActivated={() => undefined}
      onAddSubtitles={() => undefined}
      onGenerateSubtitles={() => undefined}
    />,
  );
}

function dispatchAll(store: AppStore, ...storeActions: AppAction[]) {
  act(() => {
    for (const action of storeActions) store.dispatch(action);
  });
}

const findView = () => screen.getByRole("region", { name: "Player" });

const pressKey = (key: string, target: Element = findView()) =>
  fireEvent.keyDown(target, { key });

describe("MediaView", () => {
  it("shows the subtitles panel beside a video", () => {
    renderView("video");
    expect(findView().lastElementChild?.getAttribute("aria-label")).toBe(
      "Subtitles panel",
    );
  });

  it("shows the subtitles panel above audio", () => {
    renderView("audio");
    expect(findView().firstElementChild?.getAttribute("aria-label")).toBe(
      "Subtitles panel",
    );
  });

  it("hides the subtitles panel once it is closed", () => {
    const { store } = renderView();
    dispatchAll(store, actions.subtitlesPanelToggled());
    expect(
      screen.queryByRole("complementary", { name: "Subtitles panel" }),
    ).toBeNull();
  });

  describe("keyboard shortcuts", () => {
    it("requests play for Space", () => {
      const { effects } = renderView();
      pressKey(" ");
      expect(effects.calls).toContainEqual({ type: "playPlayer" });
    });

    it("skips to the next cue for ArrowRight", () => {
      const { effects, store } = renderView();
      dispatchAll(store, actions.playerTimeChanged(600));
      pressKey("ArrowRight");
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 1750 });
    });

    it("skips back five seconds for ArrowLeft without cues", () => {
      const { effects, store } = renderView("video", null);
      dispatchAll(store, actions.playerTimeChanged(8000));
      pressKey("ArrowLeft");
      expect(effects.calls).toContainEqual({ type: "seekPlayer", ms: 3000 });
    });

    it("lowers the volume for ArrowDown", () => {
      const { effects } = renderView();
      pressKey("ArrowDown");
      expect(effects.calls).toContainEqual({ type: "setVolume", volume: 0.9 });
    });

    it("raises the volume for ArrowUp", () => {
      const { effects, store } = renderView();
      dispatchAll(store, actions.volumeChanged(0.5));
      pressKey("ArrowUp");
      expect(effects.calls).toContainEqual({ type: "setVolume", volume: 0.6 });
    });

    it("toggles the subtitles panel for S", () => {
      const { store } = renderView();
      pressKey("s");
      expect(selectSubtitles(store.getState()).panelOpen).toBe(false);
    });

    it("switches the overlaid subtitles for T", () => {
      const { store } = renderView();
      pressKey("t");
      expect(selectSubtitles(store.getState()).overlay).toBe("translation");
    });

    it("requests fullscreen for the whole view for F", () => {
      const { requestFullscreen, restore } = stubRequestFullscreen();
      renderView();
      pressKey("f");
      restore();
      expect(requestFullscreen.mock.contexts).toEqual([findView()]);
    });

    it("leaves the page as it is for F where fullscreen is unsupported", () => {
      renderView();
      expect(() => pressKey("f")).not.toThrow();
    });

    it("leaves arrow keys on a slider to the slider", () => {
      const { effects } = renderView();
      pressKey("ArrowRight", screen.getByRole("slider", { name: "Seek" }));
      expect(effects.calls).toEqual([]);
    });

    it("leaves Space on a button to the button", () => {
      const { effects } = renderView();
      pressKey(" ", screen.getByRole("button", { name: "Next cue" }));
      expect(effects.calls).toEqual([]);
    });

    it("ignores keys pressed with a modifier", () => {
      const { store } = renderView();
      fireEvent.keyDown(findView(), { key: "s", metaKey: true });
      expect(selectSubtitles(store.getState()).panelOpen).toBe(true);
    });
  });
});
