import { describe, expect, it } from "vitest";
import type { Navigation } from "./navigation.ts";
import { initialNavigation, mainScreenOf, navigate } from "./navigation.ts";

const project: Navigation = { screen: "project", projectId: "p1" };

describe("navigate", () => {
  it("opens settings over the current screen", () => {
    expect(navigate(project, { type: "openSettings" })).toEqual({
      screen: "settings",
      beneath: project,
    });
  });

  it("keeps settings as they are when they are already open", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "openSettings" })).toBe(settings);
  });

  it("returns to the screen beneath when settings close", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "closeSettings" })).toEqual(project);
  });

  it("ignores closing settings when they are not open", () => {
    expect(navigate(project, { type: "closeSettings" })).toBe(project);
  });

  it("opens a project from home", () => {
    expect(
      navigate(initialNavigation, { type: "openProject", projectId: "p2" }),
    ).toEqual({ screen: "project", projectId: "p2" });
  });

  it("opens a project's settings", () => {
    expect(
      navigate(project, { type: "openProjectSettings", projectId: "p1" }),
    ).toEqual({ screen: "projectSettings", projectId: "p1" });
  });

  it("opens the new project form", () => {
    expect(navigate(initialNavigation, { type: "createProject" })).toEqual({
      screen: "newProject",
    });
  });

  it("continues offline from home", () => {
    expect(navigate(initialNavigation, { type: "continueOffline" })).toEqual({
      screen: "offline",
    });
  });
});

describe("mainScreenOf", () => {
  it("returns the screen beneath settings", () => {
    expect(mainScreenOf({ screen: "settings", beneath: project })).toBe(
      project,
    );
  });

  it("returns a main screen as it is", () => {
    expect(mainScreenOf(project)).toBe(project);
  });
});
