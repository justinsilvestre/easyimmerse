import { isSettled } from "../../../server/isSettled.ts";
import type { RequestSettled } from "../../../server/serverRequest.ts";
import {
  formShown,
  type PluginFormWizard,
  requestFailed,
} from "../../pluginForm/pluginFormWizard.ts";
import { sourceMediaIds } from "./sourceMediaRequests.ts";

/**
 * Applies the answer to one of the source dialog's requests; answers to other requests change nothing.
 * A step's answer counts only while this opening awaits one, so a step sent before the dialog was closed and opened again is ignored.
 * The dialog closes once the plugin's changes are applied.
 */
export function sourceMediaAnswered(
  wizard: PluginFormWizard,
  action: RequestSettled,
  mediaFileId: string,
): PluginFormWizard | null {
  const ids = sourceMediaIds(mediaFileId);
  if (isSettled(action, ids.form, "getSourceForm"))
    return action.outcome.ok
      ? formShown(wizard, action.outcome.data)
      : requestFailed(wizard, action.outcome.error, "The form could not load.");
  if (
    !wizard.isAwaitingAnswer ||
    !isSettled(action, ids.step, "submitSourceStep")
  )
    return wizard;
  if (!action.outcome.ok)
    return requestFailed(
      wizard,
      action.outcome.error,
      "The changes could not be made.",
    );
  const answer = action.outcome.data;
  return answer.kind === "form" ? formShown(wizard, answer.form) : null;
}
