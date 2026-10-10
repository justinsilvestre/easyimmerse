import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { jobKey } from "../../operations/jobs.ts";
import { isAborted } from "../../server/isAborted.ts";
import { isSettled } from "../../server/isSettled.ts";
import type {
  RequestFailure,
  RequestSettled,
} from "../../server/serverRequest.ts";
import {
  endImport,
  formRequest,
  mediaImportIds,
  stepRequest,
  watchFetch,
} from "./mediaImportRequests.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";
import { skippedSubtitlesMessage } from "./skippedSubtitlesMessage.ts";

type Wizard = MediaImportWizard | null;
type Result = readonly [Wizard, readonly Effect[]];

/**
 * Runs a media-source plugin's import dialog: asks for its forms, sends each action with what the user entered,
 * and watches the fetch the last action starts. Once the fetch is done, the route opens the added file,
 * and any chosen subtitle tracks that were not added are named in a notification.
 */
export function updateMediaImport(
  wizard: Wizard,
  action: AppAction,
  projectId: string,
): Result {
  switch (action.type) {
    case "mediaImportOpened":
      return [
        {
          source: action.source,
          form: null,
          isAwaitingAnswer: false,
          jobId: null,
          error: null,
        },
        [
          ...endImport(projectId, wizard),
          formRequest(projectId, action.source.name),
        ],
      ];
    case "mediaImportStepTaken":
      if (wizard === null || wizard.isAwaitingAnswer) return [wizard, []];
      return [
        { ...wizard, isAwaitingAnswer: true, jobId: null, error: null },
        [
          ...unwatchFetch(wizard),
          stepRequest(
            projectId,
            wizard.source.name,
            action.action,
            action.input,
          ),
        ],
      ];
    case "mediaImportClosed":
      return [null, endImport(projectId, wizard)];
    case "requestSettled":
      return wizard === null || isAborted(action.outcome)
        ? [wizard, []]
        : settled(wizard, action, projectId);
    default:
      return [wizard, []];
  }
}

function settled(
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
    const job = action.outcome.data;
    const skipped =
      job.status === "done"
        ? skippedSubtitlesMessage(job.skipped_subtitles, wizard.form)
        : null;
    return [
      wizard,
      skipped === null ? [] : [{ type: "showNotification", message: skipped }],
    ];
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

function unwatchFetch(wizard: MediaImportWizard): Effect[] {
  return wizard.jobId === null
    ? []
    : [{ type: "unwatchJob", key: jobKey("mediaSource", wizard.jobId) }];
}
