import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import { haveSameItems } from "../app/haveSameItems.ts";
import type { FooterActivity } from "../footer/footerActivity.ts";
import type { JobRecord } from "../operations/jobs.ts";
import { jobKey } from "../operations/jobs.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/**
 * Selects the media-source fetches as the footer shows them, one per project; see `selectMediaFetchActivity`.
 * The result keeps its reference while the activities it lists stay the same.
 */
export const selectMediaFetchActivities = createSelector(
  [(root: RootState) => root],
  (root): readonly FooterActivity[] =>
    Object.keys(root.app.mediaImports).flatMap((projectId) => {
      const activity = selectMediaFetchActivity(root, projectId);
      return activity ? [activity] : [];
    }),
  { memoizeOptions: { resultEqualityCheck: haveSameItems } },
);

/**
 * Selects a project's fetch as the footer shows it: one under way, with its latest step and how much is done, the wait for the plugin's
 * answer to an action that may start one, or one that failed, until its dialog is closed.
 * It leads to the project's overview, and names the project once it is cached.
 * The result keeps its reference while the dialog, its fetch and the cached project do.
 */
export const selectMediaFetchActivity = createSelector(
  [
    (root: RootState, projectId: string) =>
      root.app.mediaImports[projectId] ?? null,
    (root: RootState, projectId: string) => {
      const jobId = root.app.mediaImports[projectId]?.jobId ?? null;
      return jobId === null
        ? null
        : (root.app.operations.jobs[jobKey("mediaSource", jobId)] ?? null);
    },
    (root: RootState, projectId: string) =>
      cacheEntry(root.backend, "getProject", projectId)?.data ?? null,
    (_root: RootState, projectId: string) => projectId,
  ],
  (wizard, job, project, projectId): FooterActivity | null => {
    const status = wizard && statusOf(wizard, job);
    if (!status) return null;
    const name = project?.settings.name ?? null;
    return {
      id: `media-fetch/${projectId}`,
      opens: {
        step: { type: "openProject", projectId },
        label: name === null ? "Show in the project" : `Show in ${name}`,
      },
      ...status,
      label: name === null ? status.label : `${name}: ${status.label}`,
    };
  },
);

function statusOf(wizard: MediaImportWizard, job: JobRecord | null) {
  if (wizard.jobId === null)
    return wizard.isAwaitingAnswer
      ? ({
          label: "Waiting for the plugin",
          status: "running",
          percent: null,
        } as const)
      : null;
  if (job === null) return starting;
  if (job.kind !== "mediaSource" || job.status === "done") return null;
  if (wizard.error !== null || job.status === "failed")
    return { label: "The media could not be added", status: "failed" } as const;
  const progress = job.report?.progress ?? null;
  if (progress === null) return starting;
  return {
    label: progress.message,
    status: "running",
    percent: Math.round(progress.fraction * 100),
  } as const;
}

const starting = {
  label: "Starting the fetch",
  status: "running",
  percent: null,
} as const;
