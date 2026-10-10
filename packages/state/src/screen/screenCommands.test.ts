import { describe, expect, it } from "vitest";
import type { AppAction } from "../app/appAction.ts";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { transientNotice } from "../notices/transientNotice.ts";
import type { PickedMediaFile } from "../platform/effects.ts";
import { exampleProjectSettings } from "../server/exampleProject.ts";
import {
  applied,
  sourceStepSettled,
} from "./mediaScreen/sourceMedia/exampleSourceMedia.ts";
import { screenCommands } from "./screenCommands.ts";

/** Returns the screen commands for an action after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) =>
  screenCommands(action, stateAfter(...before));

const pickedMediaFile: PickedMediaFile = {
  name: "episode.mkv",
  source: { kind: "path", path: "/videos/episode.mkv" },
};

const mediaFileAddFailed = actions.requestSettled(
  "project/p1/addMediaFile",
  { kind: "addMediaFile", projectId: "p1", request: pickedMediaFile },
  { ok: false, error: { status: 500, message: "down" } },
);

const subtitleFileAddFailed = actions.requestSettled(
  "media/m2/addSubtitleTrack",
  {
    kind: "addSubtitleTrack",
    projectId: "p1",
    mediaFileId: "m2",
    request: {
      name: "english.srt",
      source: { kind: "inline", text: "" },
      format: null,
      role: "target",
    },
  },
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

describe("screenCommands", () => {
  it("names the subtitles that a source dialog's changes did not add, even once the screen has closed", () => {
    const skipped = [{ id: "en", reason: "the plugin did not fetch it" }];
    const effects = apply(
      sourceStepSettled({ ok: true, data: applied(skipped) }),
    );
    expect(effects).toContainEqual({
      type: "showNotice",
      content: transientNotice(
        "danger",
        "The subtitles “English (automatic)” were not added: the plugin did not fetch it.",
      ),
    });
  });

  it("records that a project was opened when its overview opens", () => {
    const effects = apply(
      actions.navigated({ type: "openProject", projectId: "p1" }),
    );
    expect(effects).toContainEqual({
      type: "sendRequest",
      id: "project/p1/markOpened",
      request: { kind: "markProjectOpened", projectId: "p1" },
    });
  });

  it("returns a notice when a picked media file could not be added", () => {
    const effects = apply(
      mediaFileAddFailed,
      actions.navigated({ type: "openProject", projectId: "p1" }),
      actions.mediaFileChosen(pickedMediaFile),
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice("danger", "The media file could not be added"),
      },
    ]);
  });

  it("returns a notice when a picked media file could not be added after the project was left", () => {
    const effects = apply(mediaFileAddFailed, ...leftProject);
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice("danger", "The media file could not be added"),
      },
    ]);
  });

  it("returns a notice when a picked subtitles file could not be added", () => {
    const effects = apply(subtitleFileAddFailed, ...playingM2);
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice(
          "danger",
          "The subtitles file could not be added",
        ),
      },
    ]);
  });

  it("returns a notice when the track choice could not be saved", () => {
    const effects = apply(
      actions.requestSettled(
        "media/m2/saveTrackSelection",
        {
          kind: "saveTrackSelection",
          projectId: "p1",
          mediaFileId: "m2",
          selection: { video: 0, audio: 1 },
        },
        { ok: false, error: { status: 500, message: "down" } },
      ),
      ...playingM2,
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice(
          "danger",
          "The track choice could not be saved",
        ),
      },
    ]);
  });

  it("returns no notice for a track choice whose save was replaced", () => {
    const effects = apply(
      actions.requestSettled(
        "media/m2/saveTrackSelection",
        {
          kind: "saveTrackSelection",
          projectId: "p1",
          mediaFileId: "m2",
          selection: { video: 0, audio: 1 },
        },
        { ok: false, error: { status: "ABORTED", message: "aborted" } },
      ),
      ...playingM2,
    );
    expect(effects).toEqual([]);
  });

  it("tells that a dictionary could not be removed", () => {
    const effects = apply(
      actions.requestSettled(
        "settings/dictionaries/remove/d1",
        { kind: "deleteDictionary", dictionaryId: "d1" },
        { ok: false, error: { status: 500, message: "down" } },
      ),
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice(
          "danger",
          "The dictionary could not be removed",
        ),
      },
    ]);
  });

  it("tells that a project could not be created", () => {
    const effects = apply(
      actions.requestSettled(
        "newProject/create",
        { kind: "createProject", settings: exampleProjectSettings },
        { ok: false, error: { status: 500, message: "down" } },
      ),
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice("danger", "The project could not be created"),
      },
    ]);
  });

  it("tells that a project's settings could not be saved", () => {
    const effects = apply(
      actions.requestSettled(
        "projectSettings/p1/save",
        {
          kind: "updateProject",
          projectId: "p1",
          settings: exampleProjectSettings,
        },
        { ok: false, error: { status: 500, message: "down" } },
      ),
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice("danger", "The settings could not be saved"),
      },
    ]);
  });

  it("tells that a media file could not be removed", () => {
    const effects = apply(
      actions.requestSettled(
        "project/p1/removeMediaFile/m2",
        { kind: "removeMediaFile", projectId: "p1", mediaFileId: "m2" },
        { ok: false, error: { status: 500, message: "down" } },
      ),
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice(
          "danger",
          "The media file could not be removed",
        ),
      },
    ]);
  });

  it("tells that the subtitles could not be changed", () => {
    const effects = apply(
      actions.requestSettled(
        "media/m2/subtitleSelection/s1/none",
        {
          kind: "setSubtitleSelection",
          projectId: "p1",
          mediaFileId: "m2",
          selection: { target_track_id: "s1", translation_track_id: null },
        },
        { ok: false, error: { status: 500, message: "down" } },
      ),
    );
    expect(effects).toEqual([
      {
        type: "showNotice",
        content: transientNotice(
          "danger",
          "The subtitles could not be changed",
        ),
      },
    ]);
  });
});
