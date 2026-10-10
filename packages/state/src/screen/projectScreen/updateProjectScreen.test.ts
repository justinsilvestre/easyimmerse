import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { updateProjectScreen } from "./updateProjectScreen.ts";

const route = { screen: "project", projectId: "p1" } as const;

const picked: PickedMediaFile = {
  name: "pilot.mkv",
  source: { kind: "path", path: "/videos/pilot.mkv" },
};

const idle: ProjectScreenState = { kind: "project", pendingMediaFile: null };

const chosen: ProjectScreenState = {
  kind: "project",
  pendingMediaFile: picked,
};

const listRequest: ServerRequest = { kind: "listMediaFiles", projectId: "p1" };

const addRequest: ServerRequest = {
  kind: "addMediaFile",
  projectId: "p1",
  request: picked,
};

const listed = (...names: string[]) =>
  actions.requestSettled("project/p1/listMediaFiles", listRequest, {
    ok: true,
    data: {
      media_files: names.map((name) => exampleMediaFile(`m-${name}`, name)),
    },
  });

describe("updateProjectScreen", () => {
  it("keeps the chosen media file", () => {
    const [screen] = updateProjectScreen(
      idle,
      actions.mediaFileChosen(picked),
      route,
    );
    expect(screen).toEqual(chosen);
  });

  it("asks for the project's media files once a media file is chosen", () => {
    const [, effects] = updateProjectScreen(
      idle,
      actions.mediaFileChosen(picked),
      route,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/listMediaFiles",
        request: listRequest,
      },
    ]);
  });

  it("sends the chosen file when no file of its name is in the project", () => {
    const [, effects] = updateProjectScreen(
      chosen,
      listed("episode.mkv"),
      route,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/addMediaFile",
        request: addRequest,
      },
    ]);
  });

  it("sends the chosen file when the project's media files could not be listed", () => {
    const failed = actions.requestSettled(
      "project/p1/listMediaFiles",
      listRequest,
      { ok: false, error: { status: 500, message: "down" } },
    );
    const [, effects] = updateProjectScreen(chosen, failed, route);
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/addMediaFile",
        request: addRequest,
      },
    ]);
  });

  it("says that a file of the same name is already in the project", () => {
    const [, effects] = updateProjectScreen(chosen, listed("pilot.mkv"), route);
    expect(effects).toEqual([
      {
        type: "showNotification",
        message: "“pilot.mkv” is already in the project.",
      },
    ]);
  });

  it("forgets the chosen file once its add has settled", () => {
    const added = actions.requestSettled(
      "project/p1/addMediaFile",
      addRequest,
      {
        ok: false,
        error: { status: 500, message: "down" },
      },
    );
    const [screen] = updateProjectScreen(chosen, added, route);
    expect(screen.pendingMediaFile).toBeNull();
  });

  it("ignores a listing that it did not ask for", () => {
    const [, effects] = updateProjectScreen(
      chosen,
      actions.requestSettled("other", listRequest, {
        ok: true,
        data: { media_files: [] },
      }),
      route,
    );
    expect(effects).toEqual([]);
  });

  it("ignores a listing once no file is chosen", () => {
    const [, effects] = updateProjectScreen(idle, listed(), route);
    expect(effects).toEqual([]);
  });
});
