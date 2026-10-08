import {
  skipToken,
  useGetImportFormMutation,
  useGetMediaSourceJobQuery,
  useSubmitImportStepMutation,
} from "@easyimmerse/backend";
import { actions } from "@easyimmerse/state";
import type { FormInput, MediaSourceJob, PluginForm } from "@easyimmerse/types";
import { type Dispatch, useEffect, useReducer } from "react";
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
 * Closing the dialog stops watching the fetch; the server finishes it anyway.
 */
export function useImportMedia(projectId: string) {
  const [state, change] = useReducer(importMediaReducer, noImport);
  const [getImportForm] = useGetImportFormMutation();
  const [submitImportStep, { isLoading: isStepping }] =
    useSubmitImportStepMutation();
  const job = useWatchedJob(projectId, state.jobId);
  useOpenImportedMedia(job, state.form, change);
  const fail = (failure: unknown, fallback: string) =>
    change({ type: "failed", message: failureMessage(failure, fallback) });
  return {
    ...state,
    job,
    isBusy: isStepping,
    open: (source: ImportSource) => {
      change({ type: "opened", source });
      getImportForm({ projectId, request: { plugin: source.name } })
        .unwrap()
        .then((form) => change({ type: "formArrived", form }))
        .catch((failure) => fail(failure, "The plugin's form could not load."));
    },
    close: () => change({ type: "closed" }),
    act: (action: string, input: FormInput[]) => {
      if (state.source === null) return;
      change({ type: "stepSent" });
      const request = { plugin: state.source.name, action, input };
      submitImportStep({ projectId, request })
        .unwrap()
        .then((answer) =>
          change(
            answer.kind === "form"
              ? { type: "formArrived", form: answer.form }
              : { type: "jobStarted", jobId: answer.job.id },
          ),
        )
        .catch((failure) => fail(failure, "The media could not be added."));
    },
  };
}

/** The job with `jobId`, polled until it finishes, or null while there is none. */
function useWatchedJob(
  projectId: string,
  jobId: string | null,
): MediaSourceJob | null {
  const { data } = useGetMediaSourceJobQuery(
    jobId === null ? skipToken : { projectId, jobId },
    { pollingInterval: JOB_POLLING_INTERVAL_MS },
  );
  return data !== undefined && data.id === jobId ? data : null;
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
