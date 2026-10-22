import { updated } from "../app/updated.ts";
import { jobKey } from "../operations/jobs.ts";
import {
  formShown,
  requestFailed,
} from "../screen/pluginForm/pluginFormWizard.ts";
import { skippedSubtitlesNotice } from "../screen/pluginForm/skippedSubtitlesMessage.ts";
import { isSettled } from "../server/isSettled.ts";
import type { RequestSettled } from "../server/serverRequest.ts";
import {
  mediaImportIds,
  unwatchFetch,
  watchFetch,
} from "./mediaImportRequests.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/**
 * Applies the answer to one of the dialog's requests, or a status of its fetch; answers to other requests change nothing.
 * A fetch that has added its file ends the dialog and is no longer watched.
 */
export function mediaImportAnswered(
  wizard: MediaImportWizard,
  action: RequestSettled,
  projectId: string,
) {
  const ids = mediaImportIds(projectId);
  if (isSettled(action, ids.form, "getImportForm"))
    return action.outcome.ok
      ? updated(formShown(wizard, action.outcome.data))
      : updated(
          requestFailed(
            wizard,
            action.outcome.error,
            "The plugin's form could not load.",
          ),
        );
  if (isSettled(action, ids.step, "submitImportStep")) {
    if (!action.outcome.ok)
      return updated(
        requestFailed(
          wizard,
          action.outcome.error,
          "The media could not be added.",
        ),
      );
    const answer = action.outcome.data;
    return answer.kind === "form"
      ? updated(formShown(wizard, answer.form))
      : updated(
          { ...wizard, isAwaitingAnswer: false, jobId: answer.job.id },
          watchFetch(projectId, answer.job.id),
        );
  }
  if (
    wizard.jobId !== null &&
    isSettled(action, jobKey("mediaSource", wizard.jobId), "getMediaSourceJob")
  ) {
    if (!action.outcome.ok)
      return updated(
        requestFailed(
          wizard,
          action.outcome.error,
          "The media could not be added.",
        ),
      );
    const job = action.outcome.data;
    const notices = skippedSubtitlesNotice(job, wizard.form);
    return job.status === "done" && job.media_file !== null
      ? updated(null, ...unwatchFetch(wizard), ...notices)
      : updated(wizard, ...notices);
  }
  return updated(wizard);
}
