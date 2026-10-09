import {
  skipToken,
  useGetImportFormMutation,
  useGetMediaSourceJobQuery,
  useSubmitImportStepMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { FormInput, MediaSourceJob, PluginForm } from "@easyimmerse/types";
import { type Dispatch, useEffect, useReducer, useState } from "react";
import { useAppDispatch } from "../hooks/useAppDispatch.ts";
import { failureMessage } from "../plugins/failureMessage.ts";
import {
  type ImportMediaEvent,
  type ImportSource,
  importMediaReducer,
  noImport,
} from "./importMediaReducer.ts";
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
  const [state, change] = useReducer(importMediaReducer, noImport);
  const [getImportForm] = useGetImportFormMutation();
  const [submitImportStep] = useSubmitImportStepMutation();
  const job = useWatchedJob(projectId, state.jobId);
  useOpenImportedMedia(job, state.form, change);
  const fail = (opening: number, failure: unknown, fallback: string) =>
    change({
      type: "failed",
      opening,
      message: failureMessage(failure, fallback),
    });
  return {
    ...state,
    job,
    isBusy: state.isAwaitingAnswer || (state.jobId !== null && job === null),
    open: (source: ImportSource) => {
      const opening = state.opening + 1;
      change({ type: "opened", source });
      getImportForm({ projectId, request: { plugin: source.name } })
        .unwrap()
        .then((form) => change({ type: "formArrived", opening, form }))
        .catch((failure) =>
          fail(opening, failure, "The plugin's form could not load."),
        );
    },
    close: () => change({ type: "closed" }),
    act: (action: string, input: FormInput[]) => {
      if (state.source === null) return;
      const { opening } = state;
      change({ type: "stepSent" });
      const request = { plugin: state.source.name, action, input };
      submitImportStep({ projectId, request })
        .unwrap()
        .then((answer) =>
          change(
            answer.kind === "form"
              ? { type: "formArrived", opening, form: answer.form }
              : { type: "jobStarted", opening, jobId: answer.job.id },
          ),
        )
        .catch((failure) =>
          fail(opening, failure, "The media could not be added."),
        );
    },
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
  change: Dispatch<ImportMediaEvent>,
) {
  const dispatch = useAppDispatch();
  const isDone = job?.status === "done";
  const addedId = isDone ? (job.media_file?.id ?? null) : null;
  const skippedMessage = isDone
    ? skippedSubtitlesMessage(job.skipped_subtitles, form)
    : null;
  useEffect(() => {
    if (addedId === null) return;
    change({ type: "closed" });
    dispatch(actions.mediaFileAdded(addedId));
    if (skippedMessage !== null)
      dispatch(actions.notificationRequested(skippedMessage));
  }, [addedId, skippedMessage, change, dispatch]);
}
