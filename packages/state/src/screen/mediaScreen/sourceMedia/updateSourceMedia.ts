import type { AppAction } from "../../../app/appAction.ts";
import type { AppState } from "../../../app/appState.ts";
import { updated } from "../../../app/updated.ts";
import { isAborted } from "../../../server/isAborted.ts";
import {
  openedPluginForm,
  type PluginFormWizard,
  stepSent,
} from "../../pluginForm/pluginFormWizard.ts";
import { selectShownMediaFile } from "../mediaScreenSelectors.ts";
import { sourceMediaAnswered } from "./sourceMediaAnswered.ts";
import {
  endSourceMedia,
  sourceFormRequest,
  sourceStepRequest,
} from "./sourceMediaRequests.ts";
import { selectIsSourceStepInFlight } from "./sourceMediaSelectors.ts";

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
  const route = selectShownMediaFile(app);
  switch (action.type) {
    case "sourceMediaOpened":
      return updated(openedPluginForm, sourceFormRequest(route));
    case "sourceMediaStepTaken":
      if (wizard === null || selectIsSourceStepInFlight(app, route.mediaFileId))
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
