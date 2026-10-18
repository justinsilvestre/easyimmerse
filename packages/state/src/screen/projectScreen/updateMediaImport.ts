import type { AppAction } from "../../app/appAction.ts";
import { updated } from "../../app/updated.ts";
import { isAborted } from "../../server/isAborted.ts";
import { openedPluginForm, stepSent } from "../pluginForm/pluginFormWizard.ts";
import { mediaImportAnswered } from "./mediaImportAnswered.ts";
import {
  endImport,
  formRequest,
  stepRequest,
  unwatchFetch,
} from "./mediaImportRequests.ts";
import type { MediaImportWizard } from "./mediaImportWizard.ts";

/**
 * Runs a media-source plugin's import dialog: asks for its forms, sends each action with what the user entered,
 * and watches the fetch the last action starts. Once the fetch is done, the route opens the added file,
 * and any chosen subtitle tracks that were not added are named in a notice.
 */
export function updateMediaImport(
  wizard: MediaImportWizard | null,
  action: AppAction,
  projectId: string,
) {
  switch (action.type) {
    case "mediaImportOpened":
      return updated(
        { ...openedPluginForm, source: action.source, jobId: null },
        ...endImport(projectId, wizard),
        formRequest(projectId, action.source.name),
      );
    case "mediaImportStepTaken":
      if (wizard === null || wizard.isAwaitingAnswer) return updated(wizard);
      return updated(
        { ...stepSent(wizard), jobId: null },
        ...unwatchFetch(wizard),
        stepRequest(projectId, wizard.source.name, action.action, action.input),
      );
    case "mediaImportClosed":
      return updated(null, ...endImport(projectId, wizard));
    case "requestSettled":
      return wizard === null || isAborted(action.outcome)
        ? updated(wizard)
        : mediaImportAnswered(wizard, action, projectId);
    default:
      return updated(wizard);
  }
}
