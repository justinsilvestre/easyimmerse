import {
  useGetSourceFormMutation,
  useSubmitSourceStepMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePluginFormSession } from "../plugins/usePluginFormSession.ts";
import { skippedSubtitlesMessage } from "../projects/skippedSubtitlesMessage.ts";

/**
 * The dialog for the media interface of the plugin a media file was imported through:
 * whether it shows, the form the plugin asks for, and the actions sent to it.
 * Each opening asks the plugin for a fresh form and shows none until it arrives.
 * Once the plugin's changes are applied, the dialog closes, with a notification naming
 * any subtitle tracks that were not added. The notification shows even when the dialog
 * was closed while the changes were being made, since the changes were made all the same.
 */
export function useSourceMedia(projectId: string, mediaFileId: string) {
  const dispatch = useAppDispatch();
  const args = { projectId, mediaFileId };
  const [getSourceForm] = useGetSourceFormMutation();
  const [submitSourceStep] = useSubmitSourceStepMutation();
  const { session, open, close, act } = usePluginFormSession<string, "applied">(
    () => getSourceForm(args).unwrap(),
    (_mediaFile, action, input) => {
      const { form } = session;
      return submitSourceStep({ ...args, request: { action, input } })
        .unwrap()
        .then((answer) => {
          if (answer.kind === "form") return { form: answer.form };
          const message = skippedSubtitlesMessage(answer.skipped, form);
          if (message !== null)
            dispatch(actions.notificationRequested(message));
          return { outcome: "applied" };
        });
    },
    {
      form: "The form could not load.",
      step: "The changes could not be made.",
    },
  );
  return {
    isOpen: session.subject !== null && session.outcome === null,
    form: session.form,
    isBusy: session.isAwaitingAnswer,
    error: session.error,
    open: () => open(mediaFileId),
    close,
    act,
  };
}
