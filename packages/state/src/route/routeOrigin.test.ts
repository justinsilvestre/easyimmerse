import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";

const openedAtProject = actions.locationOpened("/projects/p1");

describe("routeOriginFeature", () => {
  it("marks a screen opened at an address as opened from a link", () => {
    expect(stateAfter(openedAtProject).routeOrigin).toBe("link");
  });

  it("marks a screen opened by a link from outside the app as opened from a link", () => {
    expect(stateAfter(actions.linkOpened("/library")).routeOrigin).toBe("link");
  });

  it("marks a screen the app navigated to as opened by the app", () => {
    const app = stateAfter(
      openedAtProject,
      actions.navigated({ type: "openLibrary" }),
    );
    expect(app.routeOrigin).toBe("app");
  });

  it("keeps the origin while Settings open over the screen", () => {
    expect(
      stateAfter(openedAtProject, actions.settingsRequested()).routeOrigin,
    ).toBe("link");
  });
});
