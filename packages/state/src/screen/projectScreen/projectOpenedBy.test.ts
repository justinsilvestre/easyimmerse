import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { projectOpenedBy } from "./projectOpenedBy.ts";

const openProject = (projectId: string) =>
  actions.navigated({ type: "openProject", projectId });

describe("projectOpenedBy", () => {
  it("returns the project whose overview opens", () => {
    expect(projectOpenedBy(stateAfter(), openProject("p1"))).toBe("p1");
  });

  it("returns the project of a media file opened from elsewhere", () => {
    const action = actions.openMediaFileRequested("p1", "m1");
    expect(projectOpenedBy(stateAfter(), action)).toBe("p1");
  });

  it("returns null when a media file of the open project opens", () => {
    const app = stateAfter(openProject("p1"));
    const action = actions.openMediaFileRequested("p1", "m1");
    expect(projectOpenedBy(app, action)).toBeNull();
  });

  it("returns null when Settings open over the project", () => {
    const app = stateAfter(openProject("p1"));
    expect(projectOpenedBy(app, actions.settingsRequested())).toBeNull();
  });

  it("returns the project when its overview returns from its settings", () => {
    const app = stateAfter(
      actions.navigated({ type: "openProjectSettings", projectId: "p1" }),
    );
    expect(projectOpenedBy(app, openProject("p1"))).toBe("p1");
  });
});
