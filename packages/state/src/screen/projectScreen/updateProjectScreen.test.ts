import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import { operationsFeature } from "../../operations/operations.ts";
import type { PickedMediaFile } from "../../platform/effects.ts";
import { exampleMediaFileAdded } from "../../server/exampleMediaFileAdded.ts";
import { emptyServerCache } from "../../server/serverCacheWith.ts";
import type { ServerRequest } from "../../server/serverRequest.ts";
import type { ProjectScreenState } from "../screenState.ts";
import { updateProjectScreen } from "./updateProjectScreen.ts";

const route = { screen: "project", projectId: "p1" } as const;

const app = {
  backend: emptyServerCache,
  operations: operationsFeature.initialState,
};

const picked: PickedMediaFile = {
  name: "pilot.mkv",
  source: { kind: "path", path: "/videos/pilot.mkv" },
};

const idle: ProjectScreenState = {
  kind: "project",
  pendingMediaFile: null,
  ankiExport: null,
  isAnkiConnectSetupOpen: false,
};

const chosen: ProjectScreenState = {
  kind: "project",
  pendingMediaFile: picked,
  ankiExport: null,
  isAnkiConnectSetupOpen: false,
};

const addRequest: ServerRequest = {
  kind: "addMediaFile",
  projectId: "p1",
  request: picked,
};

const added = (wasAlreadyInProject: boolean) =>
  actions.requestSettled("project/p1/addMediaFile", addRequest, {
    ok: true,
    data: exampleMediaFileAdded("m1", "Pilot.mkv", wasAlreadyInProject),
  });

describe("updateProjectScreen", () => {
  it("keeps the chosen media file", () => {
    const [screen] = updateProjectScreen(
      idle,
      actions.mediaFileChosen(picked),
      route,
      app,
    );
    expect(screen).toEqual(chosen);
  });

  it("sends the chosen media file to the project", () => {
    const [, effects] = updateProjectScreen(
      idle,
      actions.mediaFileChosen(picked),
      route,
      app,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/addMediaFile",
        request: addRequest,
      },
    ]);
  });

  it("says that the file is already in the project when the server had it", () => {
    const [, effects] = updateProjectScreen(chosen, added(true), route, app);
    expect(effects).toEqual([
      {
        type: "dispatch",
        action: actions.noticeRequested(
          transientNotice("info", "“Pilot.mkv” is already in the project."),
        ),
      },
    ]);
  });

  it("says nothing once the file is added", () => {
    const [, effects] = updateProjectScreen(chosen, added(false), route, app);
    expect(effects).toEqual([]);
  });

  it("forgets the chosen file once its add has settled", () => {
    const failed = actions.requestSettled(
      "project/p1/addMediaFile",
      addRequest,
      { ok: false, error: { status: 500, message: "down" } },
    );
    const [screen] = updateProjectScreen(chosen, failed, route, app);
    expect(screen.pendingMediaFile).toBeNull();
  });

  it("ignores an add that it did not send", () => {
    const [, effects] = updateProjectScreen(
      chosen,
      actions.requestSettled("other", addRequest, {
        ok: true,
        data: exampleMediaFileAdded("m1", "Pilot.mkv", true),
      }),
      route,
      app,
    );
    expect(effects).toEqual([]);
  });

  it("ignores an add once no file is chosen", () => {
    const [, effects] = updateProjectScreen(idle, added(true), route, app);
    expect(effects).toEqual([]);
  });

  it("removes a media file from the project when asked", () => {
    const [, effects] = updateProjectScreen(
      idle,
      actions.mediaFileRemovalRequested("m2"),
      route,
      app,
    );
    expect(effects).toEqual([
      {
        type: "sendRequest",
        id: "project/p1/removeMediaFile/m2",
        request: {
          kind: "removeMediaFile",
          projectId: "p1",
          mediaFileId: "m2",
        },
      },
    ]);
  });
});
