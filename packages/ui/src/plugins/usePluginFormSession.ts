import type { FormInput, PluginForm } from "@easyimmerse/types";
import { useCallback, useReducer } from "react";
import { failureMessage } from "./failureMessage.ts";
import {
  closedPluginFormSession,
  pluginFormSessionReducer,
} from "./pluginFormSessionReducer.ts";

/** A plugin's answer to an action: another form, or what the action ended in. */
type PluginStepAnswer<Outcome> = { form: PluginForm } | { outcome: Outcome };

/**
 * A dialog showing a plugin's forms for a subject.
 * Each opening asks for a fresh form, and each action sends the values entered to the plugin.
 * Answers that arrive after the dialog was closed or opened again are ignored.
 * `failureFallbacks` are the messages shown when a failure carries none of its own.
 */
export function usePluginFormSession<Subject, Outcome>(
  requestForm: (subject: Subject) => Promise<PluginForm>,
  submitStep: (
    subject: Subject,
    action: string,
    input: FormInput[],
  ) => Promise<PluginStepAnswer<Outcome>>,
  failureFallbacks: { form: string; step: string },
) {
  const [session, change] = useReducer(
    pluginFormSessionReducer<Subject, Outcome>,
    closedPluginFormSession,
  );
  const fail = (opening: number, failure: unknown, fallback: string) =>
    change({
      type: "failed",
      opening,
      message: failureMessage(failure, fallback),
    });
  return {
    session,
    open: (subject: Subject) => {
      const opening = session.opening + 1;
      change({ type: "opened", subject });
      requestForm(subject)
        .then((form) => change({ type: "formArrived", opening, form }))
        .catch((failure) => fail(opening, failure, failureFallbacks.form));
    },
    close: useCallback(() => change({ type: "closed" }), []),
    act: (action: string, input: FormInput[]) => {
      if (session.subject === null) return;
      const { opening } = session;
      change({ type: "stepSent" });
      submitStep(session.subject, action, input)
        .then((answer) => change(answeredEvent(opening, answer)))
        .catch((failure) => fail(opening, failure, failureFallbacks.step));
    },
  };
}

function answeredEvent<Outcome>(
  opening: number,
  answer: PluginStepAnswer<Outcome>,
) {
  return "form" in answer
    ? { type: "formArrived" as const, opening, form: answer.form }
    : { type: "finished" as const, opening, outcome: answer.outcome };
}
