import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import { initialAppState } from "../appState.ts";
import { update } from "../update.ts";

describe("update", () => {
  it("shows the translation on top of the video for subtitleOverlayToggled", () => {
    const [state] = update(initialAppState, actions.subtitleOverlayToggled());
    expect(state.subtitles.overlay).toBe("translation");
  });

  it("shows the target track again for a second subtitleOverlayToggled", () => {
    const [once] = update(initialAppState, actions.subtitleOverlayToggled());
    const [twice] = update(once, actions.subtitleOverlayToggled());
    expect(twice.subtitles.overlay).toBe("target");
  });

  it("closes the open subtitles panel for subtitlesPanelToggled", () => {
    const [state] = update(initialAppState, actions.subtitlesPanelToggled());
    expect(state.subtitles.panelOpen).toBe(false);
  });

  it("stores the text by track id for subtitleTextLoaded", () => {
    const [state] = update(
      initialAppState,
      actions.subtitleTextLoaded("t1", "1\n00:00:01,000 --> 00:00:02,000\nHi"),
    );
    expect(state.subtitles.browserFileTexts).toEqual({
      t1: "1\n00:00:01,000 --> 00:00:02,000\nHi",
    });
  });

  it("returns a showNotification effect for subtitleTextFailed", () => {
    const [, effects] = update(
      initialAppState,
      actions.subtitleTextFailed("t1", "file missing"),
    );
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "Could not read a subtitle file: file missing",
      },
    ]);
  });

  it("reads the text of an added track the browser holds for subtitleTrackAdded", () => {
    const [, effects] = update(
      initialAppState,
      actions.subtitleTrackAdded({
        id: "t1",
        name: "episode.srt",
        role: "target",
        language: null,
        source: { kind: "file", source: { kind: "browser_file", key: "k1" } },
      }),
    );
    expect(effects).toEqual([
      { type: "readStoredFileText", trackId: "t1", key: "k1" },
    ]);
  });
});
