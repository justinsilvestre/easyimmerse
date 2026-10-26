import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import {
  exampleProject,
  exampleProjectSettings,
} from "../server/exampleProject.ts";
import { historyWriteOf } from "./historyWriteOf.ts";
import type { Route } from "./route.ts";
import { navigate } from "./route.ts";

const home: Route = { screen: "home" };

const project: Route = { screen: "project", projectId: "p1" };

const media: Route = { screen: "media", projectId: "p1", mediaFileId: "m1" };

const settings = navigate(project, { type: "openSettings" });

const openProject = actions.navigated({ type: "openProject", projectId: "p1" });

describe("historyWriteOf", () => {
  it("pushes an entry for an ordinary move", () => {
    expect(historyWriteOf(home, project, openProject)).toBe("push");
  });

  it("pushes an entry for each settings page opened", () => {
    const step = actions.navigated({ type: "openAccountSettings" });
    expect(historyWriteOf(settings, navigate(settings, step.step), step)).toBe(
      "push",
    );
  });

  it("writes nothing for a move that keeps the path", () => {
    expect(historyWriteOf(project, project, openProject)).toBeNull();
  });

  it("writes nothing for a move that changes only the section the settings scroll to", () => {
    const step = actions.navigated({ type: "openMediaConversionSettings" });
    expect(
      historyWriteOf(settings, navigate(settings, step.step), step),
    ).toBeNull();
  });

  it("writes nothing for an address the platform shows", () => {
    expect(
      historyWriteOf(home, project, actions.locationOpened("/projects/p1")),
    ).toBeNull();
  });

  it("replaces an address the platform shows that names no screen", () => {
    expect(
      historyWriteOf(project, home, actions.locationOpened("/elsewhere")),
    ).toBe("replace");
  });

  it("pushes an entry for an opened link", () => {
    expect(
      historyWriteOf(home, project, actions.linkOpened("/projects/p1")),
    ).toBe("push");
  });

  it("replaces the entry of an unreachable screen", () => {
    expect(historyWriteOf(media, home, actions.routeUnreachable())).toBe(
      "replace",
    );
  });

  it("replaces the entry of the new project form with the project it created", () => {
    const created = actions.requestSettled(
      "newProject/create",
      { kind: "createProject", settings: exampleProjectSettings },
      { ok: true, data: exampleProject("p1") },
    );
    expect(historyWriteOf({ screen: "newProject" }, project, created)).toBe(
      "replace",
    );
  });

  it("replaces the entry of a media file once its removal succeeds", () => {
    const removed = actions.requestSettled(
      "project/p1/removeMediaFile/m1",
      { kind: "removeMediaFile", projectId: "p1", mediaFileId: "m1" },
      { ok: true, data: undefined },
    );
    expect(historyWriteOf(media, project, removed)).toBe("replace");
  });
});
