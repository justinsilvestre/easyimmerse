import type { Effect } from "../../app/effect.ts";
import { jobKey } from "../../operations/jobs.ts";
import { isSettled } from "../../server/isSettled.ts";
import type { RequestSettled } from "../../server/serverRequest.ts";
import { formShown, requestFailed } from "../pluginForm/pluginFormWizard.ts";
import { skippedSubtitlesNotice } from "../pluginForm/skippedSubtitlesMessage.ts";
import { mediaImportIds, watchFetch } from "./mediaImportRequests.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

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
      ? [formShown(wizard, action.outcome.data), []]
      : [
          requestFailed(
            wizard,
            action.outcome.error,
            "The plugin's form could not load.",
          ),
          [],
        ];
  if (isSettled(action, ids.step, "submitImportStep")) {
    if (!action.outcome.ok)
      return [
        requestFailed(
          wizard,
          action.outcome.error,
          "The media could not be added.",
        ),
        [],
      ];
    const answer = action.outcome.data;
    return answer.kind === "form"
      ? [formShown(wizard, answer.form), []]
      : [
          { ...wizard, isAwaitingAnswer: false, jobId: answer.job.id },
          [watchFetch(projectId, answer.job.id)],
        ];
  }
  if (
    wizard.jobId !== null &&
    isSettled(action, jobKey("mediaSource", wizard.jobId), "getMediaSourceJob")
  ) {
    if (!action.outcome.ok)
      return [
        requestFailed(
          wizard,
          action.outcome.error,
          "The media could not be added.",
        ),
        [],
      ];
    return [wizard, skippedSubtitlesNotice(action.outcome.data, wizard.form)];
  }
  return [wizard, []];
}
