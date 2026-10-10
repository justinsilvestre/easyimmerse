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
export function formRequest(projectId: string, plugin: string): Effect {
  return {
    type: "sendRequest",
    id: mediaImportIds(projectId).form,
    request: { kind: "getImportForm", projectId, request: { plugin } },
  };
}

/** Sends an action of the plugin's form with what the user entered. */
export function stepRequest(
  projectId: string,
  plugin: string,
  action: string,
  input: FormInput[],
): Effect {
  return {
    type: "sendRequest",
    id: mediaImportIds(projectId).step,
    request: {
      kind: "submitImportStep",
      projectId,
      request: { plugin, action, input },
    },
  };
}

/** Starts polling a fetch that a step started. */
export function watchFetch(projectId: string, jobId: string): Effect {
  return {
    type: "watchJob",
    key: jobKey("mediaSource", jobId),
    job: {
      kind: "mediaSource",
      request: { kind: "getMediaSourceJob", projectId, jobId },
    },
  };
}

/**
 * Stops what an import dialog has under way: polling its fetch, and the requests whose answers would no longer be read.
 * The server finishes a fetch it has started either way.
 */
export function endImport(
  projectId: string,
  wizard: MediaImportWizard | null,
): Effect[] {
  if (wizard === null) return [];
  const ids = mediaImportIds(projectId);
  return [
    ...(wizard.jobId === null
      ? []
      : [
          {
            type: "unwatchJob",
            key: jobKey("mediaSource", wizard.jobId),
          } as const,
        ]),
    { type: "abortRequest", id: ids.form },
    { type: "abortRequest", id: ids.step },
  ];
}
