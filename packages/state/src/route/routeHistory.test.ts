import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import { update } from "../app/update.ts";

const openedAtProject = actions.locationChanged("/projects/p1");

const openLibrary = actions.navigated({ type: "openLibrary" });

const goHome = actions.navigated({ type: "goHome" });

describe("routeHistoryFeature", () => {
  describe("for a reported location", () => {
    it("marks a screen reached through the history as opened from a link", () => {
      expect(stateAfter(openedAtProject).routeHistory.origin).toBe("link");
    });

    it("takes the origin that the app kept with an entry it wrote", () => {
      const written = actions.locationChanged(
        "/library",
        { previousPath: "/", origin: "app" },
        "write",
      );
      expect(stateAfter(written).routeHistory.origin).toBe("app");
    });

    it("takes the previous path that the app kept with the entry", () => {
      const reported = actions.locationChanged("/projects/p1", {
        previousPath: "/",
        origin: "app",
      });
      expect(stateAfter(reported).routeHistory.previousPath).toBe("/");
    });

    it("writes the home screen's path in place of a path that names no screen", () => {
      const [, effects] = update(
        stateAfter(),
        actions.locationChanged("/elsewhere"),
      );
      expect(effects).toContainEqual({
        type: "writeLocation",
        entry: { path: "/", state: { previousPath: null, origin: "link" } },
        write: "replace",
      });
    });
  });

  describe("for a request to move", () => {
    it("marks a screen the app navigated to as opened by the app", () => {
      expect(stateAfter(openedAtProject, openLibrary).routeHistory.origin).toBe(
        "app",
      );
    });

    it("marks a screen opened by a link from outside the app as opened from a link", () => {
      expect(
        stateAfter(actions.linkOpened("/library")).routeHistory.origin,
      ).toBe("link");
    });

    it("keeps the origin while Settings open over the screen", () => {
      expect(
        stateAfter(openedAtProject, actions.settingsRequested()).routeHistory
          .origin,
      ).toBe("link");
    });

    it("keeps the path of the route left with a pushed entry", () => {
      expect(
        stateAfter(openedAtProject, openLibrary).routeHistory.previousPath,
      ).toBe("/projects/p1");
    });

    it("keeps the previous path with a replaced entry", () => {
      const opened = actions.locationChanged("/library/items/i1", {
        previousPath: "/projects/p1",
        origin: "app",
      });
      expect(stateAfter(opened, openLibrary).routeHistory.previousPath).toBe(
        "/projects/p1",
      );
    });

    it("waits for the history after asking for a move", () => {
      const [state] = update(
        stateAfter(actions.locationChanged("/"), openLibrary),
        goHome,
      );
      expect(state.routeHistory.awaitsLocation).toBe(true);
    });

    it("asks for nothing while a return to the previous entry is on its way", () => {
      const [returning] = update(
        stateAfter(actions.locationChanged("/"), openLibrary),
        goHome,
      );
      expect(update(returning, openLibrary)[1]).toEqual([]);
    });
  });
});
