import type { AppAction } from "../../app/appAction.ts";
import type { Effect } from "../../app/effect.ts";
import { isAborted } from "../../server/isAborted.ts";
import { mediaImportAnswered } from "./mediaImportAnswered.ts";
import {
  endImport,
  formRequest,
  stepRequest,
  unwatchFetch,
} from "./mediaImportRequests.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

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
        : mediaImportAnswered(wizard, action, projectId);
    default:
      return [wizard, []];
  }
}
