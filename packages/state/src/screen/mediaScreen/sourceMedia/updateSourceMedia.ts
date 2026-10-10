import type { AppAction } from "../../../app/appAction.ts";
import type { AppState } from "../../../app/appState.ts";
import type { Effect } from "../../../app/effect.ts";
import type { MediaRoute } from "../../../route/route.ts";
import { isAborted } from "../../../server/isAborted.ts";
import {
  openedPluginForm,
  type PluginFormWizard,
  stepSent,
} from "../../pluginForm/pluginFormWizard.ts";
import { sourceMediaAnswered } from "./sourceMediaAnswered.ts";
import {
  endSourceMedia,
  isSourceStepInFlight,
  sourceFormRequest,
  sourceStepRequest,
} from "./sourceMediaRequests.ts";

type Wizard = PluginFormWizard | null;
type Result = readonly [Wizard, readonly Effect[]];

/**
 * Runs the media interface of the plugin a media file was imported through: asks for its forms,
 * sends each action with what the user entered, and closes once the plugin's changes are applied.
 * While a step is in flight, from this opening or an earlier one, further actions are ignored.
 * `app` is the state before the action.
 */
export function updateSourceMedia(
  wizard: Wizard,
  action: AppAction,
  route: MediaRoute,
  app: AppState,
): Result {
  switch (action.type) {
    case "sourceMediaOpened":
      return [openedPluginForm, [sourceFormRequest(route)]];
    case "sourceMediaStepTaken":
      if (
        wizard === null ||
        isSourceStepInFlight(app.operations, route.mediaFileId)
      )
        return [wizard, []];
      return [
        stepSent(wizard),
        [sourceStepRequest(route, action.action, action.input, wizard.form)],
      ];
    case "sourceMediaClosed":
      return [null, endSourceMedia(route.mediaFileId)];
    case "requestSettled":
      return wizard === null || isAborted(action.outcome)
        ? [wizard, []]
        : [sourceMediaAnswered(wizard, action, route.mediaFileId), []];
    default:
      return [wizard, []];
  }
}
