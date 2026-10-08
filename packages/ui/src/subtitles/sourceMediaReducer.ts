import type { PluginForm } from "@easyimmerse/types";

/**
 * Whether the dialog shows, the form the plugin answered an action with, if any,
 * whether the plugin is answering an action, and the latest failure.
 * `opening` counts the times the dialog was opened, so that an answer can be matched to the opening that asked for it.
 */
export type SourceMediaState = {
  opening: number;
  isOpen: boolean;
  form: PluginForm | null;
  isAwaitingAnswer: boolean;
  error: string | null;
};

/** An answer from the plugin to an action sent during the given opening of the dialog. */
type SourceMediaAnswer = { opening: number } & (
  | { type: "formArrived"; form: PluginForm }
  | { type: "applied" }
  | { type: "failed"; message: string }
);

export type SourceMediaEvent =
  | { type: "opened" }
  | { type: "closed" }
  | { type: "stepSent" }
  | SourceMediaAnswer;

export const closedSourceMedia: SourceMediaState = {
  opening: 0,
  isOpen: false,
  form: null,
  isAwaitingAnswer: false,
  error: null,
};

/** Applies an event to the dialog. Answers to an earlier opening of the dialog change nothing. */
export function sourceMediaReducer(
  state: SourceMediaState,
  event: SourceMediaEvent,
): SourceMediaState {
  switch (event.type) {
    case "opened":
      return { ...closedSourceMedia, opening: state.opening + 1, isOpen: true };
    case "closed":
      return { ...closedSourceMedia, opening: state.opening };
    case "stepSent":
      return state.isOpen
        ? { ...state, isAwaitingAnswer: true, error: null }
        : state;
    default:
      return isCurrent(state, event) ? answered(state, event) : state;
  }
}

function isCurrent(state: SourceMediaState, answer: SourceMediaAnswer) {
  return state.isOpen && answer.opening === state.opening;
}

function answered(
  state: SourceMediaState,
  answer: SourceMediaAnswer,
): SourceMediaState {
  switch (answer.type) {
    case "formArrived":
      return { ...state, isAwaitingAnswer: false, form: answer.form };
    case "applied":
      return { ...closedSourceMedia, opening: state.opening };
    case "failed":
      return { ...state, isAwaitingAnswer: false, error: answer.message };
  }
}
