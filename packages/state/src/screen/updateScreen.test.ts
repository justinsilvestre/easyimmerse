import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import { runningMediaSourceJob } from "../operations/exampleJobReports.ts";
import type { PickedMediaFile } from "../platform/effects.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { exampleProjectSettings } from "../server/exampleProject.ts";
import { withEmptyServerCache } from "../server/serverCacheWith.ts";
import { mediaFilesListed } from "./mediaScreen/playbackTestActions.ts";
import { initialPlayerState } from "./mediaScreen/playerState.ts";
import { updateScreen } from "./updateScreen.ts";

/** Applies an action to the screens after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(...before);
  return updateScreen(app.screen, action, withEmptyServerCache(app));
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

/** A project opened and then left for the home screen. */
const leftProject: AppAction[] = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.navigated({ type: "goHome" }),
];

describe("updateScreen", () => {
  it("aborts the media import's requests when the project is left", () => {
    const [, effects] = apply(
      actions.navigated({ type: "goHome" }),
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaImportOpened({ name: "video-site", label: "Video site" }),
    );
    expect(effects).toEqual(
      expect.arrayContaining([
        { type: "abortRequest", id: "project/p1/mediaImport/form" },
        { type: "abortRequest", id: "project/p1/mediaImport/step" },
      ]),
    );
  });

  it("aborts the parse of a subtitles file when the offline screen is left", () => {
    const [, effects] = apply(
      actions.navigated({ type: "goHome" }),
      actions.navigated({ type: "continueOffline" }),
    );
    expect(effects).toContainEqual({
      type: "abortRequest",
      id: "offline/parseTimedText",
    });
  });

  it("stops watching a media-source fetch when the project is left", () => {
    const [, effects] = apply(
      actions.navigated({ type: "goHome" }),
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaImportOpened({ name: "video-site", label: "Video site" }),
      actions.mediaImportStepTaken("add", []),
      actions.requestSettled(
        "project/p1/mediaImport/step",
        {
          kind: "submitImportStep",
          projectId: "p1",
          request: { plugin: "video-site", action: "add", input: [] },
        },
        { ok: true, data: { kind: "job", job: runningMediaSourceJob } },
      ),
    );
    expect(effects).toContainEqual({
      type: "unwatchJob",
      key: "jobs/mediaSource/j1",
    });
  });

  it("cancels the retry of a failed waveform window when the media screen is left", () => {
    const request = {
      kind: "getWaveformWindow",
      projectId: "p1",
      mediaFileId: "m2",
      startMs: 0,
      endMs: 30_000,
    } as const;
    const [, effects] = apply(
      actions.closeMedia(),
      ...playingM2,
      actions.requestSettled(
        "media/m2/mediaFile",
        { kind: "listMediaFiles", projectId: "p1" },
        { ok: true, data: { media_files: [exampleMediaFile("m2", "m2.mkv")] } },
      ),
      actions.waveformToggled(),
      actions.requestSettled("media/m2/waveform/player/0", request, {
        ok: false,
        error: { status: 500, message: "down" },
      }),
    );
    expect(effects).toContainEqual({
      type: "cancelTimer",
      id: "media/m2/waveform/player/0/retry",
    });
  });

  it("cancels the lookup's close timer when the media screen closes", () => {
    const [, effects] = apply(actions.closeMedia(), ...playingM2);
    expect(effects).toContainEqual({ type: "cancelTimer", id: "lookup/close" });
  });

  it("cancels the wait for a flashcard's lookup when the media screen closes", () => {
    const [, effects] = apply(actions.closeMedia(), ...playingM2);
    expect(effects).toContainEqual({
      type: "cancelTimer",
      id: "lookup/flashcardWait",
    });
  });

  it("aborts the source dialog's form request when the media screen closes", () => {
    const [, effects] = apply(
      actions.closeMedia(),
      ...playingM2,
      actions.sourceMediaOpened(),
    );
    expect(effects).toContainEqual({
      type: "abortRequest",
      id: "media/m2/sourceMedia/form",
    });
  });

  it("starts the new screen's state when the main screen changes", () => {
    const [screen] = apply(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    );
    expect(screen.main).toEqual({
      kind: "project",
      pendingMediaFile: null,
      mediaImport: null,
    });
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
    expect(screen.main.kind === "media" && screen.main.playing.player).toEqual(
      initialPlayerState,
    );
  });

  it("leaves the same media file open as it is", () => {
    const app = stateAfter(...playingM2);
    const [screen] = updateScreen(
      app.screen,
      actions.openMediaFileRequested("p1", "m2"),
      withEmptyServerCache(app),
    );
    expect(screen.main).toBe(app.screen.main);
  });

  it("keeps the main screen while Settings open over it", () => {
    const app = stateAfter(...playingM2);
    const [screen] = updateScreen(
      app.screen,
      actions.settingsRequested(),
      withEmptyServerCache(app),
    );
    expect(screen.main).toBe(app.screen.main);
  });

  it("opens the media screen once the picked file is added", () => {
    const [screen] = apply(
      actions.requestSettled(
        "project/p1/addMediaFile",
        { kind: "addMediaFile", projectId: "p1", request: pickedMediaFile },
        { ok: true, data: exampleMediaFile("m1", "episode.mkv") },
      ),
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

  it("lets the project screen tell of a duplicate as the route opens the existing file", () => {
    const [, effects] = apply(
      actions.requestSettled(
        "project/p1/listMediaFiles",
        { kind: "listMediaFiles", projectId: "p1" },
        {
          ok: true,
          data: { media_files: [exampleMediaFile("m1", "episode.mkv")] },
        },
      ),
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(effects).toContainEqual({
      type: "dispatch",
      action: actions.noticeRequested(
        transientNotice("info", "“episode.mkv” is already in the project."),
      ),
    });
  });

  it("keeps the screens as they are for an action they do not handle", () => {
    const app = stateAfter(...playingM2);
    const [screen] = updateScreen(
      app.screen,
      actions.appStarted(),
      withEmptyServerCache(app),
    );
    expect(screen).toBe(app.screen);
  });

  it("asks for the media file's record when its media screen opens", () => {
    const [, effects] = apply(actions.openMediaFileRequested("p1", "m1"));
    expect(effects).toContainEqual({
      type: "sendRequest",
      id: "media/m1/mediaFile",
      request: { kind: "listMediaFiles", projectId: "p1" },
    });
  });

  it("closes the track choice when the media screen is left", () => {
    const [screen] = apply(
      actions.closeMedia(),
      actions.openMediaFileRequested("p1", "m1"),
      mediaFilesListed(),
      actions.trackChoiceRequested(),
    );
    expect(screen.dialog).toBeNull();
  });

  it("closes the subtitle appearance dialog when the media screen is left", () => {
    const [screen] = apply(
      actions.closeMedia(),
      actions.openMediaFileRequested("p1", "m1"),
      actions.subtitleAppearanceOpened(),
    );
    expect(screen.dialog).toBeNull();
  });

  it("returns the player's effects only while the media screen is open", () => {
    const [, effects] = apply(actions.seekRequested(3));
    expect(effects).toEqual([]);
  });

  it("closes the removal question when the dictionaries page closes", () => {
    const [screen] = apply(
      actions.navigated({ type: "closeSettings" }),
      actions.navigated({ type: "openDictionaries" }),
      actions.dictionaryRemovalRequested("d1"),
    );
    expect(screen.dialog).toBeNull();
  });

  it("creates a project when the new project form is submitted", () => {
    const [, effects] = apply(
      actions.projectFormSubmitted(exampleProjectSettings),
      actions.navigated({ type: "createProject" }),
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "newProject/create",
        request: { kind: "createProject", settings: exampleProjectSettings },
      },
    ]);
  });
});
