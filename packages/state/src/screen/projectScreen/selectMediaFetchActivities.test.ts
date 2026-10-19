import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
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
import { selectMediaFetchActivities } from "./selectMediaFetchActivities.ts";

const goHome = actions.navigated({ type: "goHome" });

describe("selectMediaFetchActivities", () => {
  it("gives a running fetch's latest step and how much is done", () => {
    const app = stateAfter(...startedMediaFetch, mediaFetchChecked(), goHome);
    expect(
      selectMediaFetchActivities({ app, backend: emptyServerCache }),
    ).toMatchObject([{ label: "downloading", status: "running", percent: 50 }]);
  });

  it("says that a fetch is starting before it first reports", () => {
    const app = stateAfter(...startedMediaFetch, goHome);
    expect(
      selectMediaFetchActivities({ app, backend: emptyServerCache }),
    ).toMatchObject([{ label: "Starting the fetch", percent: null }]);
  });

  it("tells of a failed fetch", () => {
    const failed = mediaFetchChecked({ status: "failed" });
    const app = stateAfter(...startedMediaFetch, failed, goHome);
    expect(
      selectMediaFetchActivities({ app, backend: emptyServerCache }),
    ).toMatchObject([
      { label: "The media could not be added", status: "failed" },
    ]);
  });

  it("leads to the fetch's project", () => {
    const app = stateAfter(...startedMediaFetch, goHome);
    expect(
      selectMediaFetchActivities({ app, backend: emptyServerCache })[0]?.opens
        ?.step,
    ).toEqual({ type: "openProject", projectId: "p1" });
  });

  it("names the project once it is cached", () => {
    const app = stateAfter(...startedMediaFetch, goHome);
    const backend = serverCacheWith("getProject", "p1", exampleProject("p1"));
    expect(selectMediaFetchActivities({ app, backend })[0]?.opens?.label).toBe(
      "Show in Korean",
    );
  });

  it("gives nothing for a dialog with no fetch", () => {
    const app = stateAfter(...openedMediaImport);
    expect(
      selectMediaFetchActivities({ app, backend: emptyServerCache }),
    ).toEqual([]);
  });

  it("keeps its reference while the cache changes something else", () => {
    const app = stateAfter(...startedMediaFetch, goHome);
    const first = selectMediaFetchActivities({
      app,
      backend: emptyServerCache,
    });
    const backend = serverCacheWith("listMediaFiles", "p2", {
      media_files: [],
    });
    expect(selectMediaFetchActivities({ app, backend })).toBe(first);
  });
});
