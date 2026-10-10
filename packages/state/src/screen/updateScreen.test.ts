import type { MediaFile } from "@easyimmerse/types";
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

const mediaFileM1: MediaFile = {
  id: "m1",
  project_id: "p1",
  ...pickedMediaFile,
  created_at_ms: 0,
  track_selection_json: null,
  origin: null,
};

const mediaFileAddFailed = actions.requestSettled(
  "project/p1/addMediaFile",
  { kind: "addMediaFile", projectId: "p1", request: pickedMediaFile },
  { ok: false, error: { status: 500, message: "down" } },
);

/** The media screen of m2 with its player loaded and at 5 seconds. */
const playingM2: AppAction[] = [
  actions.openMediaFileRequested("p1", "m2"),
  actions.playerDurationChanged(60),
  actions.playerTimeChanged(5),
];

/** A project opened and then left for the home screen. */
const leftProject: AppAction[] = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.navigated({ type: "goHome" }),
];

describe("updateScreen", () => {
  it("starts the new screen's state when the main screen changes", () => {
    const [screen] = apply(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    );
    expect(screen.main).toEqual({ kind: "project", pendingMediaFile: null });
  });

  it("drops the player for closeMedia", () => {
    const [screen] = apply(actions.closeMedia(), ...playingM2);
    expect(screen.main.kind).toBe("project");
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
    expect(screen.main.kind).toBe("media");
  });

  it("drops a media file chosen after the project was left", () => {
    const [screen] = apply(
      actions.mediaFileChosen(pickedMediaFile),
      ...leftProject,
    );
    expect(screen.main).toEqual({ kind: "home" });
  });

  it("returns a notification when a picked media file could not be added", () => {
    const [, effects] = apply(
      mediaFileAddFailed,
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "The media file could not be added",
      },
    ]);
  });

  it("returns a notification when a picked media file could not be added after the project was left", () => {
    const [, effects] = apply(mediaFileAddFailed, ...leftProject);
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "The media file could not be added",
      },
    ]);
  });

  it("lets the project screen tell of a duplicate as the route opens the existing file", () => {
    const [, effects] = apply(
      actions.requestSettled(
        "project/p1/listMediaFiles",
        { kind: "listMediaFiles", projectId: "p1" },
        {
          ok: true,
          data: { media_files: [{ ...mediaFileM1, name: "episode.mkv" }] },
        },
      ),
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "“episode.mkv” is already in the project.",
      },
    ]);
  });

  it("returns a notification for subtitleFileAddFailed", () => {
    const [, effects] = apply(actions.subtitleFileAddFailed(), ...playingM2);
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "The subtitles file could not be added",
      },
    ]);
  });

  it("keeps the screens as they are for an action they do not handle", () => {
    const app = stateAfter(...playingM2);
    const [screen] = updateScreen(
      app.screen,
      actions.preferencesLoadRequested(),
      app,
    );
    expect(screen).toBe(app.screen);
  });

  it("returns the player's effects only while the media screen is open", () => {
    const [, effects] = apply(actions.seekRequested(3));
    expect(effects).toEqual([]);
  });
});
