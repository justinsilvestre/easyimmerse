import type { PluginForm } from "@easyimmerse/types";

/** A media-source plugin offered for importing media, with the label of its button. */
export type ImportSource = { name: string; label: string };

/**
 * The import under way: the plugin it goes through, the form the plugin last asked for,
 * the fetch it started, and the latest failure. Nothing is under way while `source` is null.
 */
export type ImportMediaState = {
  source: ImportSource | null;
  form: PluginForm | null;
  jobId: string | null;
  error: string | null;
};

export type ImportMediaEvent =
  | { type: "opened"; source: ImportSource }
  | { type: "closed" }
  | { type: "stepSent" }
  | { type: "formArrived"; form: PluginForm }
  | { type: "jobStarted"; jobId: string }
  | { type: "failed"; message: string };

export const noImport: ImportMediaState = {
  source: null,
  form: null,
  jobId: null,
  error: null,
};

/** Applies an event to the import. Answers that arrive after the dialog closed change nothing. */
export function importMediaReducer(
  state: ImportMediaState,
  event: ImportMediaEvent,
): ImportMediaState {
  if (event.type === "opened") return { ...noImport, source: event.source };
  if (state.source === null || event.type === "closed") return noImport;
  switch (event.type) {
    case "stepSent":
      return { ...state, jobId: null, error: null };
    case "formArrived":
      return { ...state, form: event.form, error: null };
    case "jobStarted":
      return { ...state, jobId: event.jobId };
    case "failed":
      return { ...state, error: event.message };
  }
}
