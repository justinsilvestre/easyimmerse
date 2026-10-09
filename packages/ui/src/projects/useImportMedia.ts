import {
  skipToken,
  useGetImportFormMutation,
  useGetMediaSourceJobQuery,
  useSubmitImportStepMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { MediaSourceJob, PluginForm } from "@easyimmerse/types";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { usePluginFormSession } from "../plugins/usePluginFormSession.ts";
import type { ImportSource } from "./MediaSection.tsx";
import { skippedSubtitlesMessage } from "./skippedSubtitlesMessage.ts";

/** How often the dialog asks the server about the fetch while it runs. */
const JOB_POLLING_INTERVAL_MS = 1000;

/**
 * The dialog for importing media through a media-source plugin: the plugin it is open for,
 * the forms the plugin asks for, and the fetch the last one starts, which the server runs as a job
 * that is polled while it runs. An imported media file opens at once, as a picked file does,
 * with a notification naming any chosen subtitle tracks that were not added.
 * The dialog stays busy from an action until the plugin's answer, or the fetch it started, is shown.
 * Closing the dialog stops watching the fetch; the server finishes it anyway.
 */
export function useImportMedia(projectId: string) {
  const [getImportForm] = useGetImportFormMutation();
  const [submitImportStep] = useSubmitImportStepMutation();
  const { session, open, close, act } = usePluginFormSession<
    ImportSource,
    string
  >(
    (source) =>
      getImportForm({ projectId, request: { plugin: source.name } }).unwrap(),
    (source, action, input) =>
      submitImportStep({
        projectId,
        request: { plugin: source.name, action, input },
      })
        .unwrap()
        .then((answer) =>
          answer.kind === "form"
            ? { form: answer.form }
            : { outcome: answer.job.id },
        ),
    {
      form: "The plugin's form could not load.",
      step: "The media could not be added.",
    },
  );
  const job = useWatchedJob(projectId, session.outcome);
  useOpenImportedMedia(job, session.form, close);
  return {
    source: session.subject,
    form: session.form,
    error: session.error,
    job,
    isBusy:
      session.isAwaitingAnswer || (session.outcome !== null && job === null),
    open,
    close,
    act,
  };
}

/** The job with `jobId`, polled while it runs, or null while there is none. */
function useWatchedJob(
  projectId: string,
  jobId: string | null,
): MediaSourceJob | null {
  const [isRunning, setIsRunning] = useState(true);
  const { data } = useGetMediaSourceJobQuery(
    jobId === null ? skipToken : { projectId, jobId },
    { pollingInterval: isRunning ? JOB_POLLING_INTERVAL_MS : 0 },
  );
  const job = data !== undefined && data.id === jobId ? data : null;
  const isJobRunning = job === null || job.status === "running";
  if (isJobRunning !== isRunning) setIsRunning(isJobRunning);
  return job;
}

/** Once the job is done, closes the dialog, opens the added media file, and tells of any skipped subtitles. */
function useOpenImportedMedia(
  job: MediaSourceJob | null,
  form: PluginForm | null,
  close: () => void,
) {
  const dispatch = useAppDispatch();
  const isDone = job?.status === "done";
  const addedId = isDone ? (job.media_file?.id ?? null) : null;
  const skippedMessage = isDone
    ? skippedSubtitlesMessage(job.skipped_subtitles, form)
    : null;
  useEffect(() => {
    if (addedId === null) return;
    close();
    dispatch(actions.mediaFileAdded(addedId));
    if (skippedMessage !== null)
      dispatch(actions.notificationRequested(skippedMessage));
  }, [addedId, skippedMessage, close, dispatch]);
}
