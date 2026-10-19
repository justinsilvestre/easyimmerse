import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { transientNotice } from "../../notices/transientNotice.ts";
import { exampleMediaFile } from "../../server/exampleMediaFile.ts";
import { exampleProject } from "../../server/exampleProject.ts";
import {
  emptyServerCache,
  serverCacheWith,
} from "../../server/serverCacheWith.ts";
import {
  mediaFetchChecked,
  openedMediaImport,
  startedMediaFetch,
} from "./exampleMediaFetch.ts";
import { mediaImportsFeature } from "./mediaImportsFeature.ts";

const goHome = actions.navigated({ type: "goHome" });
const source = { name: "video-site", label: "Video site" };
const fetchDone = mediaFetchChecked({
  status: "done",
  media_file: exampleMediaFile("m1", "a.mkv"),
});

/** Applies an action to the media imports after the given earlier actions. */
function apply(
  action: AppAction,
  before: AppAction[],
  backend = emptyServerCache,
) {
  const app = stateAfter(...before);
  return mediaImportsFeature.update(app.mediaImports, action, {
    ...app,
    backend,
  });
}

describe("mediaImportsFeature", () => {
  it("opens the dialog of the project shown", () => {
    const [imports] = apply(actions.mediaImportOpened(source), [
      actions.navigated({ type: "openProject", projectId: "p1" }),
    ]);
    expect(Object.keys(imports)).toEqual(["p1"]);
  });

  it("drops a dialog with no fetch once the project is left", () => {
    const [imports] = apply(goHome, openedMediaImport);
    expect(imports).toEqual({});
  });

  it("aborts the requests of a dialog with no fetch once the project is left", () => {
    const [, effects] = apply(goHome, openedMediaImport);
    expect(effects).toContainEqual({
      type: "abortRequest",
      id: "project/p1/mediaImport/form",
    });
  });

  it("keeps a running fetch once the project is left", () => {
    const [imports] = apply(goHome, startedMediaFetch);
    expect(imports.p1?.jobId).toBe("j1");
  });

  it("goes on watching a running fetch once the project is left", () => {
    const [, effects] = apply(goHome, startedMediaFetch);
    expect(effects).toEqual([]);
  });

  it("keeps a failed fetch once the project is left", () => {
    const failed = mediaFetchChecked({ status: "failed" });
    const [imports] = apply(goHome, [...startedMediaFetch, failed]);
    expect(imports.p1).toBeDefined();
  });

  it("follows a fetch's status while the project is not shown", () => {
    const [imports] = apply(fetchDone, [...startedMediaFetch, goHome]);
    expect(imports).toEqual({});
  });

  it("tells that a fetch added its file while the project is not shown", () => {
    const backend = serverCacheWith("getProject", "p1", exampleProject("p1"));
    const [, effects] = apply(
      fetchDone,
      [...startedMediaFetch, goHome],
      backend,
    );
    expect(effects).toContainEqual({
      type: "dispatch",
      action: actions.noticeRequested(
        transientNotice("success", "Added a.mkv to Korean"),
      ),
    });
  });

  it("tells nothing of a fetch that added its file on the project shown, which opens it", () => {
    const [, effects] = apply(fetchDone, startedMediaFetch);
    expect(effects.filter(({ type }) => type === "dispatch")).toEqual([]);
  });

  it("ignores the dialog's actions while no project is shown", () => {
    const [imports] = apply(actions.mediaImportClosed(), [
      ...startedMediaFetch,
      goHome,
    ]);
    expect(imports.p1).toBeDefined();
  });
});
