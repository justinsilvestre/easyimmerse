import {
  skipToken,
  useGetSourceFormQuery,
  useSubmitSourceStepMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { FormInput, SkippedSubtitle } from "@easyimmerse/types";
import { useReducer } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { failureMessage } from "../plugins/failureMessage.ts";
import { skippedSubtitlesMessage } from "../projects/skippedSubtitlesMessage.ts";
import { closedSourceMedia, sourceMediaReducer } from "./sourceMediaReducer.ts";

/**
 * The dialog for the media interface of the plugin a media file was imported through:
 * whether it shows, the form the plugin asks for, and the actions sent to it.
 * Once the plugin's changes are applied, the dialog closes, with a notification naming
 * any subtitle tracks that were not added. The notification shows even when the dialog
 * was closed while the changes were being made, since the changes were made all the same.
 */
export function useSourceMedia(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const [state, change] = useReducer(sourceMediaReducer, closedSourceMedia);
  const args = { projectId, mediaFileId };
  const firstForm = useGetSourceFormQuery(state.isOpen ? args : skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const [submitSourceStep] = useSubmitSourceStepMutation();
  const form = state.form ?? firstForm.data ?? null;
  const notifySkipped = (skipped: readonly SkippedSubtitle[]) => {
    const message = skippedSubtitlesMessage(skipped, form);
    if (message !== null) dispatch(actions.notificationRequested(message));
  };
  const formError =
    firstForm.error &&
    failureMessage(firstForm.error, "The form could not load.");
  return {
    isOpen: state.isOpen,
    form,
    isBusy: state.isAwaitingAnswer,
    error: state.error ?? formError ?? null,
    open: () => change({ type: "opened" }),
    close: () => change({ type: "closed" }),
    act: (action: string, input: FormInput[]) => {
      const { opening } = state;
      change({ type: "stepSent" });
      submitSourceStep({ ...args, request: { action, input } })
        .unwrap()
        .then((answer) => {
          if (answer.kind === "form") {
            change({ type: "formArrived", opening, form: answer.form });
          } else {
            change({ type: "applied", opening });
            notifySkipped(answer.skipped);
          }
        })
        .catch((failure) =>
          change({
            type: "failed",
            opening,
            message: failureMessage(failure, "The changes could not be made."),
          }),
        );
    },
  };
}
