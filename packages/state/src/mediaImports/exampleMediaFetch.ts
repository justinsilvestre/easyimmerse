import type { MediaSourceJob } from "@easyimmerse/types";
import { actions } from "../app/appAction.ts";
import { runningMediaSourceJob } from "../operations/exampleJobReports.ts";
import type { RequestOutcome } from "../server/serverRequest.ts";

const source = { name: "video-site", label: "Video site" };

/** The actions that open project p1 and press the Add action of its video-site plugin, whose answer has not come. */
export const sentMediaImportStep = [
  actions.navigated({ type: "openProject", projectId: "p1" }),
  actions.mediaImportOpened(source),
  actions.mediaImportStepTaken("add", []),
];

/** The answer to p1's step with the given form or job. */
export function mediaImportStepAnswered(
  data: Extract<RequestOutcome<"submitImportStep">, { ok: true }>["data"],
) {
  return actions.requestSettled(
    "project/p1/mediaImport/step",
    {
      kind: "submitImportStep",
      projectId: "p1",
      request: { plugin: "video-site", action: "add", input: [] },
    },
    { ok: true, data },
  );
}

/** The actions that open project p1 and start a fetch through its video-site plugin, whose job is j1. */
export const startedMediaFetch = [
  ...sentMediaImportStep,
  mediaImportStepAnswered({ kind: "job", job: runningMediaSourceJob }),
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
