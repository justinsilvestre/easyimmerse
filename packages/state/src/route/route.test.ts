import { describe, expect, it } from "vitest";
import type { Route } from "./route.ts";
import { initialRoute, isAlreadyAt, mainScreenOf, navigate } from "./route.ts";

const project: Route = { screen: "project", projectId: "p1" };

describe("navigate", () => {
  it("keeps the route itself when the step leads where the app already is", () => {
    const project: Route = { screen: "project", projectId: "p1" };
    expect(navigate(project, { type: "openProject", projectId: "p1" })).toBe(
      project,
    );
  });

  it("opens settings over the current screen", () => {
    expect(navigate(project, { type: "openSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general"],
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

  it("opens the dictionaries over the current screen", () => {
    expect(navigate(project, { type: "openDictionaries" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["dictionaries"],
    });
  });

  it("opens the dictionaries on top of the general settings", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "openDictionaries" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general", "dictionaries"],
    });
  });

  it("returns from the dictionaries to the general settings they were opened from", () => {
    const settings = navigate(project, { type: "openSettings" });
    const dictionaries = navigate(settings, { type: "openDictionaries" });
    expect(navigate(dictionaries, { type: "closeSettings" })).toEqual(settings);
  });

  it("returns from the dictionaries to the screen they were opened over", () => {
    const dictionaries = navigate(project, { type: "openDictionaries" });
    expect(navigate(dictionaries, { type: "closeSettings" })).toEqual(project);
  });

  it("opens the account settings over the current screen", () => {
    expect(navigate(project, { type: "openAccountSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general"],
    });
  });

  it("leaves the dictionaries for the account settings", () => {
    const dictionaries = navigate(project, { type: "openDictionaries" });
    expect(navigate(dictionaries, { type: "openAccountSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general"],
    });
  });

  it("keeps the general settings as they are for the account settings", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "openAccountSettings" })).toBe(settings);
  });

  it("opens a project from home", () => {
    expect(
      navigate(initialRoute, { type: "openProject", projectId: "p2" }),
    ).toEqual({ screen: "project", projectId: "p2" });
  });

  it("opens a project's settings", () => {
    expect(
      navigate(project, { type: "openProjectSettings", projectId: "p1" }),
    ).toEqual({ screen: "projectSettings", projectId: "p1" });
  });

  it("opens a project's review", () => {
    expect(
      navigate(initialRoute, { type: "openReview", projectId: "p1" }),
    ).toEqual({ screen: "review", projectId: "p1" });
  });

  it("opens the new project form", () => {
    expect(navigate(initialRoute, { type: "createProject" })).toEqual({
      screen: "newProject",
    });
  });

  it("continues offline from home", () => {
    expect(navigate(initialRoute, { type: "continueOffline" })).toEqual({
      screen: "offline",
    });
  });
});

describe("mainScreenOf", () => {
  it("returns the screen beneath settings", () => {
    expect(
      mainScreenOf({
        screen: "settings",
        beneath: project,
        pages: ["general"],
      }),
    ).toBe(project);
  });

  it("returns a main screen as it is", () => {
    expect(mainScreenOf(project)).toBe(project);
  });
});

describe("isAlreadyAt", () => {
  const project: Route = { screen: "project", projectId: "p1" };
  const dictionaries: Route = {
    screen: "settings",
    beneath: project,
    pages: ["general", "dictionaries"],
  };

  it("tells that the dictionaries page is on top", () => {
    expect(isAlreadyAt(dictionaries, { type: "openDictionaries" })).toBe(true);
  });

  it("tells that the dictionaries page is not on top while General is", () => {
    const general: Route = { ...dictionaries, pages: ["general"] };
    expect(isAlreadyAt(general, { type: "openDictionaries" })).toBe(false);
  });

  it("tells that a project's screen is on top", () => {
    expect(isAlreadyAt(project, { type: "openProject", projectId: "p1" })).toBe(
      true,
    );
  });

  it("tells that a project's screen is not on top beneath Settings", () => {
    expect(
      isAlreadyAt(dictionaries, { type: "openProject", projectId: "p1" }),
    ).toBe(false);
  });

  it("tells that another project's screen is not on top", () => {
    expect(isAlreadyAt(project, { type: "openProject", projectId: "p2" })).toBe(
      false,
    );
  });
});
