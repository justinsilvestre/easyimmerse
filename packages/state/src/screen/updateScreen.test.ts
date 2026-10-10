import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import type { PickedMediaFile } from "../platform/effects.ts";
import { updateScreen } from "./updateScreen.ts";

/** Applies an action to the screens after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(...before);
  return updateScreen(app.screen, action, app);
};

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

/** The media screen of m2 with its player loaded and at 5 seconds. */
const playingM2: AppAction[] = [
  actions.openMediaFileRequested("p1", "m2"),
  actions.playerDurationChanged(60),
  actions.playerTimeChanged(5),
];

describe("updateScreen", () => {
  it("starts the new screen's state when the main screen changes", () => {
    const [screen] = apply(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    );
    expect(screen.main).toEqual({ kind: "project", pendingMediaFile: null });
  });

  it("resets the player's position and duration for closeMedia", () => {
    const [screen] = apply(actions.closeMedia(), ...playingM2);
    expect(screen.main).not.toHaveProperty("player");
  });

  it("resets the player when another media file opens", () => {
    const [screen] = apply(
      actions.openMediaFileRequested("p1", "m1"),
      ...playingM2,
    );
    expect(screen.main).toEqual({
      kind: "media",
      player: {
        currentTimeSeconds: 0,
        durationSeconds: 0,
        buffered: [],
        isPlaying: false,
      },
      pendingSubtitleFile: null,
    });
  });

  it("leaves the same media file open as it is", () => {
    const app = stateAfter(...playingM2);
    const [screen] = updateScreen(
      app.screen,
      actions.openMediaFileRequested("p1", "m2"),
      app,
    );
    expect(screen.main).toBe(app.screen.main);
  });

  it("keeps the main screen while Settings open over it", () => {
    const app = stateAfter(...playingM2);
    const [screen] = updateScreen(app.screen, actions.settingsRequested(), app);
    expect(screen.main).toBe(app.screen.main);
  });

  it("forgets the chosen media file for mediaFileAdded", () => {
    const [screen] = apply(
      actions.mediaFileAdded("m1"),
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(screen.main).not.toHaveProperty("pendingMediaFile");
  });

  it("drops a media file chosen after the project was left", () => {
    const [screen] = apply(actions.mediaFileChosen(pickedMediaFile));
    expect(screen.main).toEqual({ kind: "home" });
  });

  it("returns the player's effects only while the media screen is open", () => {
    const [, effects] = apply(actions.seekRequested(3));
    expect(effects).toEqual([]);
  });
});
