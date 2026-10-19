import { createSelector } from "reselect";
import type { RootState } from "../app/createAppStore.ts";
import type { FooterActivity } from "../footer/footerActivity.ts";
import { haveSameActivities } from "../footer/haveSameActivities.ts";
import type { JobsState } from "../operations/jobs.ts";
import { jobKey } from "../operations/jobs.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import { cacheEntry } from "../server/cacheEntry.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/**
 * Selects the media-source fetches as the footer shows them, one per project: each fetch under way, with its latest step and how much is done,
 * and each that failed, until its dialog is closed. Each leads to its project's overview, named after the project once it is cached.
 */
export const selectMediaFetchActivities = createSelector(
  [
    (root: RootState) => root.app.mediaImports,
    (root: RootState) => root.app.operations.jobs,
    (root: RootState) => root.backend,
  ],
  (imports, jobs, backend): readonly FooterActivity[] =>
    Object.entries(imports).flatMap(([projectId, wizard]) => {
      const activity = wizard && activityOf(projectId, wizard, jobs, backend);
      return activity ? [activity] : [];
    }),
  { memoizeOptions: { resultEqualityCheck: haveSameActivities } },
);

function activityOf(
  projectId: string,
  wizard: MediaImportWizard,
  jobs: JobsState,
  backend: ServerCacheSlice,
): FooterActivity | null {
  if (wizard.jobId === null) return null;
  const record = jobs[jobKey("mediaSource", wizard.jobId)];
  if (record?.kind !== "mediaSource" || record.status === "done") return null;
  const common = {
    id: `media-fetch/${projectId}`,
    opens: opensProject(projectId, backend),
  };
  if (wizard.error !== null || record.status === "failed")
    return {
      ...common,
      label: "The media could not be added",
      status: "failed",
    };
  const progress = record.report?.progress ?? null;
  return {
    ...common,
    label: progress?.message ?? "Starting the fetch",
    status: "running",
    percent: progress === null ? null : Math.round(progress.fraction * 100),
  };
}

function opensProject(projectId: string, backend: ServerCacheSlice) {
  const project = cacheEntry(backend, "getProject", projectId)?.data;
  return {
    step: { type: "openProject", projectId },
    label: project ? `Show in ${project.settings.name}` : "Show in the project",
  } as const;
}
