import type { AppAction } from "../../../app/appAction.ts";
import type { AppState } from "../../../app/appState.ts";
import { updated } from "../../../app/updated.ts";
import { isAborted } from "../../../server/isAborted.ts";
import {
  openedPluginForm,
  type PluginFormWizard,
  stepSent,
} from "../../pluginForm/pluginFormWizard.ts";
import { shownMediaFile } from "../shownMediaScreen.ts";
import { sourceMediaAnswered } from "./sourceMediaAnswered.ts";
import {
  endSourceMedia,
  isSourceStepInFlight,
  sourceFormRequest,
  sourceStepRequest,
} from "./sourceMediaRequests.ts";

/**
 * Runs the media interface of the plugin a media file was imported through: asks for its forms,
 * sends each action with what the user entered, and closes once the plugin's changes are applied.
 * While a step is in flight, from this opening or an earlier one, further actions are ignored.
 */
export function updateSourceMedia(
  wizard: PluginFormWizard | null,
  action: AppAction,
  app: AppState,
) {
  const route = shownMediaFile(app);
  switch (action.type) {
    case "sourceMediaOpened":
      return updated(openedPluginForm, sourceFormRequest(route));
    case "sourceMediaStepTaken":
      if (
        wizard === null ||
        isSourceStepInFlight(app.operations, route.mediaFileId)
      )
        return updated(wizard);
      return updated(
        stepSent(wizard),
        sourceStepRequest(route, action.action, action.input, wizard.form),
      );
    case "sourceMediaClosed":
      return updated(null, ...endSourceMedia(route.mediaFileId));
    case "requestSettled":
      return wizard === null || isAborted(action.outcome)
        ? updated(wizard)
        : updated(sourceMediaAnswered(wizard, action, route.mediaFileId));
    default:
      return updated(wizard);
  }
}
