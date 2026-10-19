import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { show } from "../flashcards/flashcardNotices.ts";
import type { FailedRequest } from "../operations/failedRequests.ts";

/** Whether the saves kept on the device have been loaded, before which nothing is written over them. */
export type RecoveryState = { isLoaded: boolean };

/** Loads the saves kept on the device when the app starts, and lists them among the failed saves. */
export const updateRecovery: FeatureUpdate<RecoveryState> = (
  recovery,
  action,
) => {
  switch (action.type) {
    case "appStarted":
      return updated(recovery, { type: "loadRecoverableSaves" });
    case "recoverableSavesLoaded":
      return updated({ isLoaded: true }, ...restored(action.saves));
    default:
      return updated(recovery);
  }
};

/** The recovery of flashcard work the app closed on, as a feature. */
export const recoveryFeature: Feature<RecoveryState> = {
  initialState: { isLoaded: false },
  update: updateRecovery,
};

function restored(saves: readonly FailedRequest[] | "unreadable"): Effect[] {
  if (saves === "unreadable")
    return [
      show({
        tone: "danger",
        message:
          "Couldn't recover the flashcard changes that were not saved when the app last closed.",
        buttons: [],
        isTransient: false,
      }),
    ];
  return saves.map((failed) => ({ type: "keepFailedRequest", failed }));
}
