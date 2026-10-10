import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { runningMediaSourceJob } from "../../operations/exampleJobReports.ts";
import { selectMediaImport } from "./selectMediaImport.ts";

const source = { name: "video-site", label: "Add from a video site" };
const input = [{ field: "url", values: ["https://videos.example.com/abc"] }];
const stepRequest = {
  kind: "submitImportStep",
  projectId: "p1",
  request: { plugin: "video-site", action: "add", input },
} as const;
const statusRequest = {
  kind: "getMediaSourceJob",
  projectId: "p1",
  jobId: "j1",
} as const;

const fetchStarted = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaImportOpened(source),
  actions.mediaImportStepTaken("add", input),
  actions.requestSettled("project/p1/mediaImport/step", stepRequest, {
    ok: true,
    data: { kind: "job", job: runningMediaSourceJob },
  }),
];

const fetchReported = actions.requestSettled(
  "jobs/mediaSource/j1",
  statusRequest,
  { ok: true, data: runningMediaSourceJob },
);

describe("selectMediaImport", () => {
  it("is null while the dialog is closed", () => {
    expect(selectMediaImport({ app: stateAfter() })).toBeNull();
  });

  it("is busy while the plugin answers an action", () => {
    const app = stateAfter(...fetchStarted.slice(0, 3));
    expect(selectMediaImport({ app })?.isBusy).toBe(true);
  });

  it("is busy once the fetch has started, until it first reports", () => {
    const app = stateAfter(...fetchStarted);
    expect(selectMediaImport({ app })?.isBusy).toBe(true);
  });

  it("gives the fetch as it last reported", () => {
    const app = stateAfter(...fetchStarted, fetchReported);
    expect(selectMediaImport({ app })?.job).toEqual(runningMediaSourceJob);
  });

  it("shows the fetch as failed when its status cannot be fetched", () => {
    const lost = actions.requestSettled("jobs/mediaSource/j1", statusRequest, {
      ok: false,
      error: { status: 500, message: "down" },
    });
    const app = stateAfter(...fetchStarted, fetchReported, lost);
    expect(selectMediaImport({ app })?.job?.status).toBe("failed");
  });

  it("gives the same result while nothing it shows changes", () => {
    const app = stateAfter(...fetchStarted, fetchReported);
    const before = selectMediaImport({ app });
    const after = { ...app, preferences: { ...app.preferences } };
    expect(selectMediaImport({ app: after })).toBe(before);
  });
});
