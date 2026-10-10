import type { MediaSourceJob, PluginForm } from "@easyimmerse/types";
import type { RootState } from "../../app/createAppStore.ts";
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

/** Selects the media import dialog open over the project overview, with its fetch, or null while it is closed. */
export function selectMediaImport(state: RootState): MediaImportView | null {
  const main = state.app.screen.main;
  const wizard = main.kind === "project" ? main.mediaImport : null;
  if (wizard === null) return null;
  const fetch = wizard.jobId === null ? null : fetchOf(state, wizard.jobId);
  return {
    source: wizard.source,
    form: wizard.form,
    error: wizard.error,
    job: fetch?.job ?? null,
    isBusy: wizard.isAwaitingAnswer || fetch?.isWaiting === true,
  };
}

/** The fetch as the dialog shows it; one whose status could not be fetched shows as failed. */
function fetchOf(state: RootState, jobId: string) {
  const record = state.app.operations.jobs[jobKey("mediaSource", jobId)];
  if (record?.kind !== "mediaSource") return null;
  const { report, status } = record;
  return {
    job: report === null ? null : { ...report, status },
    isWaiting: status === "running" && report === null,
  };
}
