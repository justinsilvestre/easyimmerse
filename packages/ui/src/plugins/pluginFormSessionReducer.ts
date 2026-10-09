import type { PluginForm } from "@easyimmerse/types";

/**
 * A dialog showing a plugin's forms: what it is open for, the form the plugin last asked for,
 * whether the plugin is answering an action, what the last action ended in, and the latest failure.
 * The dialog is closed while `subject` is null.
 * `opening` counts the times the dialog was opened, so that an answer can be matched to the opening that asked for it.
 */
export type PluginFormSession<Subject, Outcome> = {
  opening: number;
  subject: Subject | null;
  form: PluginForm | null;
  isAwaitingAnswer: boolean;
  outcome: Outcome | null;
  error: string | null;
};

/** An answer from the plugin to a request sent during the given opening of the dialog. */
type PluginFormAnswer<Outcome> = { opening: number } & (
  | { type: "formArrived"; form: PluginForm }
  | { type: "finished"; outcome: Outcome }
  | { type: "failed"; message: string }
);

export type PluginFormSessionEvent<Subject, Outcome> =
  | { type: "opened"; subject: Subject }
  | { type: "closed" }
  | { type: "stepSent" }
  | PluginFormAnswer<Outcome>;

export const closedPluginFormSession: PluginFormSession<never, never> = {
  opening: 0,
  subject: null,
  form: null,
  isAwaitingAnswer: false,
  outcome: null,
  error: null,
};

/** Applies an event to the dialog. Answers to an earlier opening of the dialog change nothing. */
export function pluginFormSessionReducer<Subject, Outcome>(
  state: PluginFormSession<Subject, Outcome>,
  event: PluginFormSessionEvent<Subject, Outcome>,
): PluginFormSession<Subject, Outcome> {
  switch (event.type) {
    case "opened":
      return {
        ...closedPluginFormSession,
        opening: state.opening + 1,
        subject: event.subject,
      };
    case "closed":
      return { ...closedPluginFormSession, opening: state.opening };
    case "stepSent":
      return state.subject === null
        ? state
        : { ...state, isAwaitingAnswer: true, outcome: null, error: null };
    default:
      return isCurrent(state, event) ? answered(state, event) : state;
  }
}

function isCurrent<Subject, Outcome>(
  state: PluginFormSession<Subject, Outcome>,
  answer: PluginFormAnswer<Outcome>,
) {
  return state.subject !== null && answer.opening === state.opening;
}

function answered<Subject, Outcome>(
  state: PluginFormSession<Subject, Outcome>,
  answer: PluginFormAnswer<Outcome>,
): PluginFormSession<Subject, Outcome> {
  const settled = { ...state, isAwaitingAnswer: false };
  switch (answer.type) {
    case "formArrived":
      return { ...settled, form: answer.form, error: null };
    case "finished":
      return { ...settled, outcome: answer.outcome };
    case "failed":
      return { ...settled, error: answer.message };
  }
}
