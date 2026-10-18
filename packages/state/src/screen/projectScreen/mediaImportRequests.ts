import type { FormInput } from "@easyimmerse/types";
import type { Effect } from "../../app/effect.ts";
import { jobKey } from "../../operations/jobs.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/** The ids of the requests that a project's media import dialog sends. */
export const mediaImportIds = (projectId: string) => ({
  form: `project/${projectId}/mediaImport/form`,
  step: `project/${projectId}/mediaImport/step`,
});

/** Asks a media-source plugin for the first form of its import interface. */
export function formRequest(projectId: string, plugin: string) {
  return {
    type: "sendRequest",
    id: mediaImportIds(projectId).form,
    request: { kind: "getImportForm", projectId, request: { plugin } },
  } satisfies Effect;
}

/** Sends an action of the plugin's form with what the user entered. */
export function stepRequest(
  projectId: string,
  plugin: string,
  action: string,
  input: FormInput[],
) {
  return {
    type: "sendRequest",
    id: mediaImportIds(projectId).step,
    request: {
      kind: "submitImportStep",
      projectId,
      request: { plugin, action, input },
    },
  } satisfies Effect;
}

/** Starts polling a fetch that a step started. */
export function watchFetch(projectId: string, jobId: string) {
  const request = { kind: "getMediaSourceJob", projectId, jobId } as const;
  return {
    type: "watchJob",
    job: { kind: "mediaSource", request },
  } satisfies Effect;
}

/** Stops polling the dialog's fetch, if it is watching one. */
export function unwatchFetch(wizard: MediaImportWizard) {
  return wizard.jobId === null
    ? []
    : ([
        { type: "unwatchJob", key: jobKey("mediaSource", wizard.jobId) },
      ] satisfies Effect[]);
}

/**
 * Stops what an import dialog has under way: polling its fetch, and the requests whose answers would no longer be read.
 * The server finishes a fetch it has started either way.
 */
export function endImport(projectId: string, wizard: MediaImportWizard | null) {
  if (wizard === null) return [];
  const ids = mediaImportIds(projectId);
  return [
    ...unwatchFetch(wizard),
    { type: "abortRequest", id: ids.form },
    { type: "abortRequest", id: ids.step },
  ] satisfies Effect[];
}
