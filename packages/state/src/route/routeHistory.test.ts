import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";

const openedAtProject = actions.locationOpened("/projects/p1");

const openLibrary = actions.navigated({ type: "openLibrary" });

describe("routeHistoryFeature", () => {
  it("marks a screen opened at an address as opened from a link", () => {
    expect(stateAfter(openedAtProject).routeHistory.origin).toBe("link");
  });

  it("marks a screen opened by a link from outside the app as opened from a link", () => {
    expect(stateAfter(actions.linkOpened("/library")).routeHistory.origin).toBe(
      "link",
    );
  });

  it("marks a screen the app navigated to as opened by the app", () => {
    expect(stateAfter(openedAtProject, openLibrary).routeHistory.origin).toBe(
      "app",
    );
  });

  it("keeps the origin while Settings open over the screen", () => {
    expect(
      stateAfter(openedAtProject, actions.settingsRequested()).routeHistory
        .origin,
    ).toBe("link");
  });

  it("takes the previous path that the platform's address holds", () => {
    expect(
      stateAfter(actions.locationOpened("/projects/p1", "/")).routeHistory
        .previousPath,
    ).toBe("/");
  });

  it("takes the path of the route left as the previous path of a pushed entry", () => {
    expect(
      stateAfter(openedAtProject, openLibrary).routeHistory.previousPath,
    ).toBe("/projects/p1");
  });

  it("keeps the previous path when the current entry is replaced", () => {
    const opened = actions.locationOpened("/library/items/i1", "/projects/p1");
    expect(stateAfter(opened, openLibrary).routeHistory.previousPath).toBe(
      "/projects/p1",
    );
  });

  it("forgets the previous path while a return to it is on its way", () => {
    expect(
      stateAfter(
        actions.locationOpened("/"),
        openLibrary,
        actions.navigated({ type: "goHome" }),
      ).routeHistory.previousPath,
    ).toBeNull();
  });
});
