import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
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

  it("opens the added media file for mediaFileAdded", () => {
    expect(nextRoute(project, actions.mediaFileAdded("m1"))).toEqual(media);
  });

  it("opens the added media file beneath settings for mediaFileAdded", () => {
    expect(
      nextRoute(settingsOver(project), actions.mediaFileAdded("m1")),
    ).toEqual(settingsOver(media));
  });

  it("stays put for mediaFileAdded away from a project", () => {
    const home: Route = { screen: "home" };
    expect(nextRoute(home, actions.mediaFileAdded("m1"))).toBe(home);
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

describe("routeAfter", () => {
  it("opens the media file that a settled pick names", () => {
    expect(routeAfter(stateAfter(...pickedInProject), added)).toEqual(media);
  });

  it("opens the media file that a settled pick names beneath Settings opened meanwhile", () => {
    const app = stateAfter(...pickedInProject, actions.settingsRequested());
    expect(routeAfter(app, added)).toEqual(settingsOver(media));
  });

  it("takes the route's own next step for any other action", () => {
    expect(routeAfter(stateAfter(), actions.settingsRequested())).toEqual(
      settingsOver({ screen: "home" }),
    );
  });
});
