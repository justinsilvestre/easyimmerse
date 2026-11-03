import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import { exampleMediaFileAdded } from "../../server/exampleMediaFileAdded.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import { mediaFileOpenedBy } from "./mediaFileOpenedBy.ts";

const picked: PickedMediaFile = {
  name: "pilot.mkv",
  source: { kind: "path", path: "/videos/pilot.mkv" },
};

const addRequest: ServerRequest = {
  kind: "addMediaFile",
  projectId: "p1",
  request: picked,
};

const pickedInProject: AppAction[] = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaFileChosen(picked),
];

const added = (wasAlreadyInProject: boolean) =>
  actions.requestSettled("project/p1/addMediaFile", addRequest, {
    ok: true,
    data: exampleMediaFileAdded(
      "m-pilot.mkv",
      "pilot.mkv",
      wasAlreadyInProject,
    ),
  });

describe("mediaFileOpenedBy", () => {
  it("returns the file that the add created", () => {
    expect(
      mediaFileOpenedBy(stateAfter(...pickedInProject), added(false)),
    ).toBe("m-pilot.mkv");
  });

  it("returns the file that the add found already in the project", () => {
    expect(mediaFileOpenedBy(stateAfter(...pickedInProject), added(true))).toBe(
      "m-pilot.mkv",
    );
  });

  it("returns null for an add that failed", () => {
    const failed = actions.requestSettled(
      "project/p1/addMediaFile",
      addRequest,
      { ok: false, error: { status: 500, message: "down" } },
    );
    expect(
      mediaFileOpenedBy(stateAfter(...pickedInProject), failed),
    ).toBeNull();
  });

  it("returns null for an add that settles after the project was left", () => {
    const app = stateAfter(
      ...pickedInProject,
      actions.navigated({ type: "goHome" }),
    );
    expect(mediaFileOpenedBy(app, added(false))).toBeNull();
  });
});
