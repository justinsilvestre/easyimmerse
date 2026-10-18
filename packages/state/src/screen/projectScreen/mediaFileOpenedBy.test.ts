import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import { mediaFileOpenedBy } from "./mediaFileOpenedBy.ts";

const picked: PickedMediaFile = {
  name: "pilot.mkv",
  source: { kind: "path", path: "/videos/pilot.mkv" },
};

const listRequest: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };

const addRequest: ServerRequest = {
  kind: "addMediaFile",
  projectId: "p1",
  request: picked,
};

const pickedInProject: AppAction[] = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaFileChosen(picked),
];

const listed = (...names: string[]) =>
  actions.requestSettled("project/p1/listMediaFiles", listRequest, {
    ok: true,
    data: {
      media_files: names.map((name) => exampleMediaFile(`m-${name}`, name)),
    },
  });

const added = actions.requestSettled("project/p1/addMediaFile", addRequest, {
  ok: true,
  data: exampleMediaFile("m-pilot.mkv", "pilot.mkv"),
});

describe("mediaFileOpenedBy", () => {
  it("returns the file that the add created", () => {
    expect(mediaFileOpenedBy(stateAfter(...pickedInProject), added)).toBe(
      "m-pilot.mkv",
    );
  });

  it("returns the file of the same name already in the project", () => {
    expect(
      mediaFileOpenedBy(
        stateAfter(...pickedInProject),
        listed("episode.mkv", "pilot.mkv"),
      ),
    ).toBe("m-pilot.mkv");
  });

  it("returns null while no file of that name is in the project", () => {
    expect(
      mediaFileOpenedBy(stateAfter(...pickedInProject), listed("episode.mkv")),
    ).toBeNull();
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
    expect(mediaFileOpenedBy(app, added)).toBeNull();
  });
});
