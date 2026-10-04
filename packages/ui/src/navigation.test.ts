import { describe, expect, it } from "vitest";
import type { Navigation } from "./navigation.ts";
import { initialNavigation, mainScreenOf, navigate } from "./navigation.ts";

const project: Navigation = { screen: "project", projectId: "p1" };

describe("navigate", () => {
  it("opens an overlay over the current screen", () => {
    expect(
      navigate(project, { type: "openOverlay", overlay: "settings" }),
    ).toEqual({ screen: "settings", beneath: project });
  });

  it("replaces an open overlay with another over the same screen", () => {
    const settings = navigate(project, {
      type: "openOverlay",
      overlay: "settings",
    });
    expect(
      navigate(settings, { type: "openOverlay", overlay: "dictionaries" }),
    ).toEqual({ screen: "dictionaries", beneath: project });
  });

  it("returns to the screen beneath when an overlay closes", () => {
    const settings = navigate(project, {
      type: "openOverlay",
      overlay: "settings",
    });
    expect(navigate(settings, { type: "closeOverlay" })).toEqual(project);
  });

  it("ignores closing an overlay when none is open", () => {
    expect(navigate(project, { type: "closeOverlay" })).toBe(project);
  });

  it("opens a project from home", () => {
    expect(
      navigate(initialNavigation, { type: "openProject", projectId: "p2" }),
    ).toEqual({ screen: "project", projectId: "p2" });
  });

  it("opens a project's settings", () => {
    expect(
      navigate(project, { type: "editProjectSettings", projectId: "p1" }),
    ).toEqual({ screen: "projectSettings", projectId: "p1" });
  });

  it("opens the new project form", () => {
    expect(navigate(initialNavigation, { type: "createProject" })).toEqual({
      screen: "newProject",
    });
  });
});

describe("mainScreenOf", () => {
  it("returns the screen beneath an overlay", () => {
    expect(mainScreenOf({ screen: "settings", beneath: project })).toBe(
      project,
    );
  });

  it("returns a main screen as it is", () => {
    expect(mainScreenOf(project)).toBe(project);
  });
});
