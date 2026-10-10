import type { MediaSourceJob, PluginForm } from "@easyimmerse/types";
import { createSelector } from "reselect";
import type { RootState } from "../../app/createAppStore.ts";
import type { JobsState } from "../../operations/jobs.ts";
import { jobKey } from "../../operations/jobs.ts";
import type { MediaImportSource } from "./mediaImportWizard.ts";

/** What the media import dialog shows. */
export type MediaImportView = {
  source: MediaImportSource;
  form: PluginForm | null;
  error: string | null;
  /** The fetch as it last reported, or null before it first reports. */
  job: MediaSourceJob | null;
  /** True while the plugin answers an action, or a fetch has started and not yet reported. */
  isBusy: boolean;
};

/**
 * Selects the media import dialog open over the project overview, with its fetch, or null while it is closed.
 * The result keeps its reference while the dialog and the jobs do.
 */
export const selectMediaImport = createSelector(
  [
    (state: RootState) =>
      state.app.screen.main.kind === "project"
        ? state.app.screen.main.mediaImport
        : null,
    (state: RootState) => state.app.operations.jobs,
  ],
  (wizard, jobs): MediaImportView | null => {
    if (wizard === null) return null;
    const fetch = wizard.jobId === null ? null : fetchOf(jobs, wizard.jobId);
    return {
      source: wizard.source,
      form: wizard.form,
      error: wizard.error,
      job: fetch?.job ?? null,
      isBusy: wizard.isAwaitingAnswer || fetch?.isWaiting === true,
    };
  },
);

/** The fetch as the dialog shows it; one whose status could not be fetched shows as failed. */
function fetchOf(jobs: JobsState, jobId: string) {
  const record = jobs[jobKey("mediaSource", jobId)];
  if (record?.kind !== "mediaSource") return null;
  const { report, status } = record;
  return {
    job: report === null ? null : { ...report, status },
    isWaiting: status === "running" && report === null,
  };
}
