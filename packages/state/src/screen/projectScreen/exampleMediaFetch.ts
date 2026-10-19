import type { MediaSourceJob } from "@easyimmerse/types";
import { actions } from "../../app/appAction.ts";
import { runningMediaSourceJob } from "../../operations/exampleJobReports.ts";

const source = { name: "video-site", label: "Video site" };

/** The actions that open project p1 and start a fetch through its video-site plugin, whose job is j1. */
export const startedMediaFetch = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaImportOpened(source),
  actions.mediaImportStepTaken("add", []),
  actions.requestSettled(
    "project/p1/mediaImport/step",
    {
      kind: "submitImportStep",
      projectId: "p1",
      request: { plugin: "video-site", action: "add", input: [] },
    },
    { ok: true, data: { kind: "job", job: runningMediaSourceJob } },
  ),
];

/** The actions that open project p1's video-site import dialog, which asks for its form. */
export const openedMediaImport = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaImportOpened(source),
];

/** A status of fetch j1, as `runningMediaSourceJob` with the given changes. */
export function mediaFetchChecked(job: Partial<MediaSourceJob> = {}) {
  return actions.requestSettled(
    "jobs/mediaSource/j1",
    { kind: "getMediaSourceJob", projectId: "p1", jobId: "j1" },
    { ok: true, data: { ...runningMediaSourceJob, ...job } },
  );
}
