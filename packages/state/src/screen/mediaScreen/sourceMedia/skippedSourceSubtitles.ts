import type { AppAction } from "../../../app/appAction.ts";
import type { Effect } from "../../../app/effect.ts";
import type { RequestSettled } from "../../../server/serverRequest.ts";
import { skippedSubtitlesEffects } from "../../pluginForm/skippedSubtitlesMessage.ts";

type SourceStepSettled = Extract<
  RequestSettled,
  { request: { kind: "submitSourceStep" } }
>;

/**
 * Names in a notice the subtitle tracks that a source dialog's applied changes did not add.
 * It reads the settled request, so the notice shows even when the dialog or its screen has closed meanwhile.
 */
export function skippedSourceSubtitles(action: AppAction): Effect[] {
  if (!isSourceStepSettled(action) || !action.outcome.ok) return [];
  const answer = action.outcome.data;
  return answer.kind === "applied"
    ? skippedSubtitlesEffects(answer.skipped, action.request.form)
    : [];
}

function isSourceStepSettled(action: AppAction): action is SourceStepSettled {
  return (
    action.type === "requestSettled" &&
    action.request.kind === "submitSourceStep"
  );
}
