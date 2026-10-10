import type { Effect } from "../../app/effect.ts";
import { jobKey } from "../../operations/jobs.ts";
import { isSettled } from "../../server/isSettled.ts";
import type {
  RequestFailure,
  RequestSettled,
} from "../../server/serverRequest.ts";
import { mediaImportIds, watchFetch } from "./mediaImportRequests.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";
import { skippedSubtitlesNotice } from "./skippedSubtitlesMessage.ts";

type Result = readonly [MediaImportWizard, readonly Effect[]];

/** Applies the answer to one of the dialog's requests, or a status of its fetch; answers to other requests change nothing. */
export function mediaImportAnswered(
  wizard: MediaImportWizard,
  action: RequestSettled,
  projectId: string,
): Result {
  const ids = mediaImportIds(projectId);
  if (isSettled(action, ids.form, "getImportForm"))
    return action.outcome.ok
      ? [{ ...wizard, form: action.outcome.data, error: null }, []]
      : [
          failed(
            wizard,
            action.outcome.error,
            "The plugin's form could not load.",
          ),
          [],
        ];
  if (isSettled(action, ids.step, "submitImportStep")) {
    if (!action.outcome.ok)
      return [
        failed(wizard, action.outcome.error, "The media could not be added."),
        [],
      ];
    const answer = action.outcome.data;
    const answered = { ...wizard, isAwaitingAnswer: false };
    return answer.kind === "form"
      ? [{ ...answered, form: answer.form, error: null }, []]
      : [
          { ...answered, jobId: answer.job.id },
          [watchFetch(projectId, answer.job.id)],
        ];
  }
  if (
    wizard.jobId !== null &&
    isSettled(action, jobKey("mediaSource", wizard.jobId), "getMediaSourceJob")
  ) {
    if (!action.outcome.ok)
      return [
        failed(wizard, action.outcome.error, "The media could not be added."),
        [],
      ];
    return [wizard, skippedSubtitlesNotice(action.outcome.data, wizard.form)];
  }
  return [wizard, []];
}

function failed(
  wizard: MediaImportWizard,
  failure: RequestFailure,
  fallback: string,
): MediaImportWizard {
  return {
    ...wizard,
    isAwaitingAnswer: false,
    error: failure.message || fallback,
  };
}
