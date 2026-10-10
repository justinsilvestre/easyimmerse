import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { runningMediaSourceJob } from "../operations/exampleJobReports.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import {
  exampleProject,
  exampleProjectSettings,
} from "../server/exampleProject.ts";
import type { Route } from "./route.ts";
import { nextRoute, routeAfter } from "./updateRoute.ts";

const project: Route = { screen: "project", projectId: "p1" };

const media: Route = { screen: "media", projectId: "p1", mediaFileId: "m1" };

const settingsOver = (beneath: Route): Route =>
  nextRoute(beneath, actions.settingsRequested());

describe("nextRoute", () => {
  it("takes the navigation step for navigated", () => {
    expect(
      nextRoute(
        { screen: "home" },
        actions.navigated({ type: "openProject", projectId: "p1" }),
      ),
    ).toEqual(project);
  });

  it("opens settings over the current screen for settingsRequested", () => {
    expect(nextRoute({ screen: "home" }, actions.settingsRequested())).toEqual({
      screen: "settings",
      beneath: { screen: "home" },
      pages: ["general"],
    });
  });

  it("opens the media file for openMediaFileRequested", () => {
    expect(
      nextRoute({ screen: "home" }, actions.openMediaFileRequested("p1", "m1")),
    ).toEqual(media);
  });

  it("closes settings for openMediaFileRequested", () => {
    expect(
      nextRoute(
        settingsOver(media),
        actions.openMediaFileRequested("p1", "m1"),
      ),
    ).toEqual(media);
  });

  it("returns to the project for closeMedia", () => {
    expect(nextRoute(media, actions.closeMedia())).toEqual(project);
  });

  it("returns to the project for mediaFileRemoved when the open file is removed", () => {
    expect(nextRoute(media, actions.mediaFileRemoved("m1"))).toEqual(project);
  });

  it("keeps the open media file for mediaFileRemoved when another is removed", () => {
    expect(nextRoute(media, actions.mediaFileRemoved("m2"))).toBe(media);
  });

  it("stays put for an action that does not move the app", () => {
    expect(nextRoute(media, actions.playerTimeChanged(3))).toBe(media);
  });
});

const picked = {
  name: "a.mkv",
  source: { kind: "path", path: "/videos/a.mkv" },
} as const;

const pickedInProject = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaFileChosen(picked),
];

const added = actions.requestSettled(
  "project/p1/addMediaFile",
  { kind: "addMediaFile", projectId: "p1", request: picked },
  { ok: true, data: exampleMediaFile("m1", "a.mkv") },
);

const fetchStatusRequest = {
  kind: "getMediaSourceJob",
  projectId: "p1",
  jobId: "j1",
} as const;

const fetchStarted = [
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
];

const fetchDone = actions.requestSettled(
  "jobs/mediaSource/j1",
  fetchStatusRequest,
  {
    ok: true,
    data: {
      ...runningMediaSourceJob,
      status: "done",
      media_file: exampleMediaFile("m1", "a.mkv"),
    },
  },
);

const created = actions.requestSettled(
  "newProject/create",
  { kind: "createProject", settings: exampleProjectSettings },
  { ok: true, data: exampleProject("p3") },
);

describe("routeAfter", () => {
  it("opens the project the new project form created", () => {
    const app = stateAfter(actions.navigated({ type: "createProject" }));
    expect(routeAfter(app, created)).toEqual({
      screen: "project",
      projectId: "p3",
    });
  });

  it("stays where the user went when a creation settles after the form was left", () => {
    const app = stateAfter(
      actions.navigated({ type: "createProject" }),
      actions.navigated({ type: "goHome" }),
    );
    expect(routeAfter(app, created)).toEqual({ screen: "home" });
  });

  it("stays on the form when the creation failed", () => {
    const app = stateAfter(actions.navigated({ type: "createProject" }));
    const failed = actions.requestSettled(
      "newProject/create",
      { kind: "createProject", settings: exampleProjectSettings },
      { ok: false, error: { status: 500, message: "down" } },
    );
    expect(routeAfter(app, failed)).toEqual({ screen: "newProject" });
  });

  it("opens the media file that a settled pick names", () => {
    expect(routeAfter(stateAfter(...pickedInProject), added)).toEqual(media);
  });

  it("opens the media file that a settled pick names beneath Settings opened meanwhile", () => {
    const app = stateAfter(...pickedInProject, actions.settingsRequested());
    expect(routeAfter(app, added)).toEqual(settingsOver(media));
  });

  it("opens the media file that a media-source fetch added", () => {
    const app = stateAfter(...fetchStarted);
    expect(routeAfter(app, fetchDone)).toEqual(media);
  });

  it("stays on the project when a fetch ends without a media file", () => {
    const app = stateAfter(...fetchStarted);
    const failed = actions.requestSettled(
      "jobs/mediaSource/j1",
      fetchStatusRequest,
      { ok: true, data: { ...runningMediaSourceJob, status: "failed" } },
    );
    expect(routeAfter(app, failed)).toEqual(project);
  });

  it("takes the route's own next step for any other action", () => {
    expect(routeAfter(stateAfter(), actions.settingsRequested())).toEqual(
      settingsOver({ screen: "home" }),
    );
  });
});
