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

  it("opens the pairing page on top of the general settings", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "openPairing" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general", "pairing"],
    });
  });

  it("opens the server page on top of the general settings", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "openServerSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general", "server"],
    });
  });

  it("opens the users page of the app's own server on top of the server page", () => {
    const server = navigate(project, { type: "openServerSettings" });
    expect(navigate(server, { type: "openUsers", via: "self" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["server", "users"],
    });
  });

  it("opens the users page of the linked server on top of the account settings", () => {
    const account = navigate(project, { type: "openAccountSettings" });
    expect(
      navigate(account, { type: "openUsers", via: "linkedRemote" }),
    ).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["account", "linkedRemoteUsers"],
    });
  });

  it("opens the account settings screen by itself over the current screen", () => {
    expect(navigate(project, { type: "openAccountSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["account"],
    });
  });

  it("opens the account settings screen on top of the general settings", () => {
    const settings = navigate(project, { type: "openSettings" });
    expect(navigate(settings, { type: "openAccountSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general", "account"],
    });
  });

  it("returns from the account settings screen to the screen it was opened over", () => {
    const account = navigate(project, { type: "openAccountSettings" });
    expect(navigate(account, { type: "closeSettings" })).toEqual(project);
  });

  it("opens the general settings at the media conversion section", () => {
    expect(navigate(project, { type: "openMediaConversionSettings" })).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general"],
      scrollTarget: "mediaConversion",
    });
  });

  it("leaves the dictionaries for the media conversion settings", () => {
    const dictionaries = navigate(project, { type: "openDictionaries" });
    expect(
      navigate(dictionaries, { type: "openMediaConversionSettings" }),
    ).toEqual({
      screen: "settings",
      beneath: project,
      pages: ["general"],
      scrollTarget: "mediaConversion",
    });
  });

  it("stays on the account settings screen when it is already open", () => {
    const account = navigate(project, { type: "openAccountSettings" });
    expect(navigate(account, { type: "openAccountSettings" })).toBe(account);
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

  it("opens the library from home", () => {
    expect(navigate(initialRoute, { type: "openLibrary" })).toEqual({
      screen: "library",
    });
  });

  it("opens a library item from the library", () => {
    expect(
      navigate(
        { screen: "library" },
        { type: "openLibraryItem", itemId: "i1" },
      ),
    ).toEqual({ screen: "libraryItem", itemId: "i1" });
  });

  it("opens the library management screen from the library", () => {
    expect(navigate({ screen: "library" }, { type: "manageLibrary" })).toEqual({
      screen: "libraryManage",
    });
  });

  it("opens a library item for editing", () => {
    expect(
      navigate(
        { screen: "library" },
        { type: "editLibraryItem", itemId: "i1" },
      ),
    ).toEqual({ screen: "libraryEdit", itemId: "i1" });
  });

  it("moves from one library item to another", () => {
    expect(
      navigate(
        { screen: "libraryItem", itemId: "i1" },
        { type: "openLibraryItem", itemId: "i2" },
      ),
    ).toEqual({ screen: "libraryItem", itemId: "i2" });
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
