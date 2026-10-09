import type { PluginForm } from "@easyimmerse/types";

/** A media-source plugin offered for importing media, with the label of its button. */
export type ImportSource = { name: string; label: string };

/**
 * The import under way: the plugin it goes through, the form the plugin last asked for,
 * whether the plugin is answering an action, the fetch it started, and the latest failure.
 * Nothing is under way while `source` is null.
 * `opening` counts the times the dialog was opened, so that an answer can be matched to the opening that asked for it.
 */
export type ImportMediaState = {
  opening: number;
  source: ImportSource | null;
  form: PluginForm | null;
  isAwaitingAnswer: boolean;
  jobId: string | null;
  error: string | null;
};

/** An answer from the plugin to a request sent during the given opening of the dialog. */
type ImportMediaAnswer = { opening: number } & (
  | { type: "formArrived"; form: PluginForm }
  | { type: "jobStarted"; jobId: string }
  | { type: "failed"; message: string }
);

export type ImportMediaEvent =
  | { type: "opened"; source: ImportSource }
  | { type: "closed" }
  | { type: "stepSent" }
  | ImportMediaAnswer;

export const noImport: ImportMediaState = {
  opening: 0,
  source: null,
  form: null,
  isAwaitingAnswer: false,
  jobId: null,
  error: null,
};

/** Applies an event to the import. Answers to an earlier opening of the dialog change nothing. */
export function importMediaReducer(
  state: ImportMediaState,
  event: ImportMediaEvent,
): ImportMediaState {
  switch (event.type) {
    case "opened":
      return { ...noImport, opening: state.opening + 1, source: event.source };
    case "closed":
      return { ...noImport, opening: state.opening };
    case "stepSent":
      return state.source === null
        ? state
        : { ...state, isAwaitingAnswer: true, jobId: null, error: null };
    default:
      return isCurrent(state, event) ? answered(state, event) : state;
  }
}

function isCurrent(state: ImportMediaState, answer: ImportMediaAnswer) {
  return state.source !== null && answer.opening === state.opening;
}

function answered(
  state: ImportMediaState,
  answer: ImportMediaAnswer,
): ImportMediaState {
  const settled = { ...state, isAwaitingAnswer: false };
  switch (answer.type) {
    case "formArrived":
      return { ...settled, form: answer.form, error: null };
    case "jobStarted":
      return { ...settled, jobId: answer.jobId };
    case "failed":
      return { ...settled, error: answer.message };
  }
}
