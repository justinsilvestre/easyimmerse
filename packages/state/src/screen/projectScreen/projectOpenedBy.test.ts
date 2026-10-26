import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { projectOpenedBy } from "./projectOpenedBy.ts";

const openProject = (projectId: string) =>
  actions.navigated({ type: "openProject", projectId });

const toProject = actions.locationChanged("/projects/p1");

const toMedia = actions.locationChanged("/projects/p1/media/m1");

describe("projectOpenedBy", () => {
  it("returns the project whose overview opens", () => {
    expect(projectOpenedBy(stateAfter(), toProject)).toBe("p1");
  });

  it("returns the project of a media file opened from elsewhere", () => {
    expect(projectOpenedBy(stateAfter(), toMedia)).toBe("p1");
  });

  it("returns null when a media file of the open project opens", () => {
    const app = stateAfter(openProject("p1"));
    expect(projectOpenedBy(app, toMedia)).toBeNull();
  });

  it("returns null when Settings open over the project", () => {
    const app = stateAfter(openProject("p1"));
    expect(
      projectOpenedBy(
        app,
        actions.locationChanged("/projects/p1?settings=general"),
      ),
    ).toBeNull();
  });

  it("returns the project when its overview returns from its settings", () => {
    const app = stateAfter(
      actions.navigated({ type: "openProjectSettings", projectId: "p1" }),
    );
    expect(projectOpenedBy(app, toProject)).toBe("p1");
  });
});
