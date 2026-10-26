import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import {
  exampleProject,
  exampleProjectSettings,
} from "../server/exampleProject.ts";
import { historyWriteOf } from "./historyWriteOf.ts";
import type { NavigationStep, Route } from "./route.ts";
import { navigate } from "./route.ts";

const home: Route = { screen: "home" };

const library: Route = { screen: "library" };

const project: Route = { screen: "project", projectId: "p1" };

const media: Route = { screen: "media", projectId: "p1", mediaFileId: "m1" };

const settings = navigate(project, { type: "openSettings" });

const accountSettings = navigate(settings, { type: "openAccountSettings" });

/** Returns how taking the step from the route writes the history, given the previous entry's path. */
const writeOfStep = (
  route: Route,
  step: NavigationStep,
  previousPath: string | null = null,
) =>
  historyWriteOf(
    route,
    navigate(route, step),
    actions.navigated(step),
    previousPath,
  );

describe("historyWriteOf", () => {
  it("pushes an entry for an ordinary move", () => {
    expect(writeOfStep(home, { type: "openProject", projectId: "p1" })).toBe(
      "push",
    );
  });

  it("pushes an entry for a move to the home screen from a screen that does not belong to it", () => {
    expect(writeOfStep(project, { type: "openLibrary" }, "/")).toBe("push");
  });

  it("pushes an entry for each settings page opened", () => {
    expect(writeOfStep(settings, { type: "openAccountSettings" })).toBe("push");
  });

  it("writes nothing for a move that keeps the path", () => {
    expect(
      writeOfStep(project, { type: "openProject", projectId: "p1" }),
    ).toBeNull();
  });

  it("writes nothing for a move that changes only the section the settings scroll to", () => {
    expect(
      writeOfStep(settings, { type: "openMediaConversionSettings" }),
    ).toBeNull();
  });

  describe("for a step of the app's own Back controls", () => {
    it("returns to the previous entry when that entry is the step's target", () => {
      expect(writeOfStep(project, { type: "goHome" }, "/")).toBe("back");
    });

    it("replaces the current entry when the previous entry is another screen", () => {
      expect(writeOfStep(project, { type: "goHome" }, "/library")).toBe(
        "replace",
      );
    });

    it("replaces the current entry when the previous entry is unknown", () => {
      expect(writeOfStep(project, { type: "goHome" })).toBe("replace");
    });

    it("returns to the previous entry when closing a settings page leads to it", () => {
      expect(
        writeOfStep(
          accountSettings,
          { type: "closeSettings" },
          "/projects/p1?settings=general",
        ),
      ).toBe("back");
    });

    it("returns to the previous entry when closing the last settings page leads to it", () => {
      expect(
        writeOfStep(settings, { type: "closeSettings" }, "/projects/p1"),
      ).toBe("back");
    });

    it("returns to the previous entry when closing a media file leads to it", () => {
      expect(
        historyWriteOf(media, project, actions.closeMedia(), "/projects/p1"),
      ).toBe("back");
    });

    it("returns to the previous entry when leaving a library item for the library", () => {
      expect(
        writeOfStep(
          { screen: "libraryItem", itemId: "i1" },
          { type: "openLibrary" },
          "/library",
        ),
      ).toBe("back");
    });
  });

  it("writes nothing for an address the platform shows", () => {
    expect(
      historyWriteOf(
        home,
        project,
        actions.locationOpened("/projects/p1"),
        null,
      ),
    ).toBeNull();
  });

  it("replaces an address the platform shows that names no screen", () => {
    expect(
      historyWriteOf(project, home, actions.locationOpened("/elsewhere"), null),
    ).toBe("replace");
  });

  it("pushes an entry for an opened link", () => {
    expect(
      historyWriteOf(home, library, actions.linkOpened("/library"), null),
    ).toBe("push");
  });

  it("replaces the entry of an unreachable screen", () => {
    expect(historyWriteOf(media, home, actions.routeUnreachable(), "/")).toBe(
      "replace",
    );
  });

  it("replaces the entry of the new project form with the project it created", () => {
    const created = actions.requestSettled(
      "newProject/create",
      { kind: "createProject", settings: exampleProjectSettings },
      { ok: true, data: exampleProject("p1") },
    );
    expect(
      historyWriteOf({ screen: "newProject" }, project, created, null),
    ).toBe("replace");
  });

  describe("for a move to the screen the current one belongs to that the app makes itself", () => {
    const removed = actions.requestSettled(
      "project/p1/removeMediaFile/m1",
      { kind: "removeMediaFile", projectId: "p1", mediaFileId: "m1" },
      { ok: true, data: undefined },
    );

    it("returns to the previous entry when the open media file's removal leads to it", () => {
      expect(historyWriteOf(media, project, removed, "/projects/p1")).toBe(
        "back",
      );
    });

    it("replaces the entry of a removed media file opened from elsewhere", () => {
      expect(historyWriteOf(media, project, removed, "/library")).toBe(
        "replace",
      );
    });

    it("returns to the previous entry when saved project settings open the project they came from", () => {
      const saved = actions.requestSettled(
        "projectSettings/p1/save",
        {
          kind: "updateProject",
          projectId: "p1",
          settings: exampleProjectSettings,
        },
        { ok: true, data: exampleProject("p1") },
      );
      expect(
        historyWriteOf(
          { screen: "projectSettings", projectId: "p1" },
          project,
          saved,
          "/projects/p1",
        ),
      ).toBe("back");
    });
  });

  it("pushes an entry for an opened link to the screen the current one belongs to", () => {
    expect(historyWriteOf(project, home, actions.linkOpened("/"), "/")).toBe(
      "push",
    );
  });
});
