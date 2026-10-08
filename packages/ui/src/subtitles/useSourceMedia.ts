import {
  skipToken,
  useGetSourceFormQuery,
  useSubmitSourceStepMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type {
  FormInput,
  PluginForm,
  SkippedSubtitle,
} from "@easyimmerse/types";
import { useReducer } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { failureMessage } from "../plugins/failureMessage.ts";
import { skippedSubtitlesMessage } from "../projects/skippedSubtitlesMessage.ts";

/**
 * The dialog for the media interface of the plugin a media file was imported through:
 * whether it shows, the form the plugin asks for, and the actions sent to it.
 * Once the plugin's changes are applied, the dialog closes, with a notification naming
 * any subtitle tracks that were not added.
 */
export function useSourceMedia(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const [state, change] = useReducer(sourceMediaReducer, closed);
  const args = { projectId, mediaFileId };
  const firstForm = useGetSourceFormQuery(state.isOpen ? args : skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const [submitSourceStep, { isLoading: isBusy }] =
    useSubmitSourceStepMutation();
  const form = state.form ?? firstForm.data ?? null;
  const finish = (skipped: readonly SkippedSubtitle[]) => {
    change({ type: "closed" });
    const message = skippedSubtitlesMessage(skipped, form);
    if (message !== null) dispatch(actions.notificationRequested(message));
  };
  const formError =
    firstForm.error &&
    failureMessage(firstForm.error, "The form could not load.");
  return {
    isOpen: state.isOpen,
    form,
    isBusy,
    error: state.error ?? formError ?? null,
    open: () => change({ type: "opened" }),
    close: () => change({ type: "closed" }),
    act: (action: string, input: FormInput[]) => {
      change({ type: "stepSent" });
      submitSourceStep({ ...args, request: { action, input } })
        .unwrap()
        .then((answer) => {
          if (answer.kind === "form")
            change({ type: "formArrived", form: answer.form });
          else finish(answer.skipped);
        })
        .catch((failure) =>
          change({
            type: "failed",
            message: failureMessage(failure, "The changes could not be made."),
          }),
        );
    },
  };
}

/** Whether the dialog shows, the form the plugin answered an action with, if any, and the latest failure. */
type SourceMediaState = {
  isOpen: boolean;
  form: PluginForm | null;
  error: string | null;
};

type SourceMediaEvent =
  | { type: "opened" }
  | { type: "closed" }
  | { type: "stepSent" }
  | { type: "formArrived"; form: PluginForm }
  | { type: "failed"; message: string };

const closed: SourceMediaState = { isOpen: false, form: null, error: null };

function sourceMediaReducer(
  state: SourceMediaState,
  event: SourceMediaEvent,
): SourceMediaState {
  if (event.type === "opened") return { ...closed, isOpen: true };
  if (!state.isOpen || event.type === "closed") return closed;
  switch (event.type) {
    case "stepSent":
      return { ...state, error: null };
    case "formArrived":
      return { ...state, form: event.form };
    case "failed":
      return { ...state, error: event.message };
  }
}
