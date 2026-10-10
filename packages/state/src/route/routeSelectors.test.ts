import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import { stateAfter } from "../app/stateAfter.ts";
import {
  selectCurrentMediaFileId,
  selectIsSettingsOpen,
  selectRoute,
} from "./routeSelectors.ts";

const project = {
  app: stateAfter(actions.navigated({ type: "openProject", projectId: "p1" })),
};

const media = { app: stateAfter(actions.openMediaFileRequested("p1", "m1")) };

describe("routeSelectors", () => {
  it("selectRoute returns where the app is", () => {
    expect(selectRoute(project)).toEqual({
      screen: "project",
      projectId: "p1",
    });
  });

  it("selectIsSettingsOpen returns false while a main screen shows", () => {
    expect(selectIsSettingsOpen(project)).toBe(false);
  });

  it("selectIsSettingsOpen returns true while Settings lie over the main screen", () => {
    const settings = { app: stateAfter(actions.settingsRequested()) };
    expect(selectIsSettingsOpen(settings)).toBe(true);
  });

  it("selectCurrentMediaFileId returns the open media file's id", () => {
    expect(selectCurrentMediaFileId(media)).toBe("m1");
  });

  it("selectCurrentMediaFileId returns the media file's id beneath Settings", () => {
    const settings = {
      app: stateAfter(
        actions.openMediaFileRequested("p1", "m1"),
        actions.settingsRequested(),
      ),
    };
    expect(selectCurrentMediaFileId(settings)).toBe("m1");
  });

  it("selectCurrentMediaFileId returns null while no media file is open", () => {
    expect(selectCurrentMediaFileId(project)).toBeNull();
  });
});
