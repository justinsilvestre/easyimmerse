import type { Effect } from "../app/effect.ts";
import type { Feature, FeatureUpdate } from "../app/feature.ts";
import { updated } from "../app/updated.ts";
import { show } from "../flashcards/flashcardNotices.ts";
import { sendFlashcardRequest } from "../flashcards/flashcardRequests.ts";
import type { OperationsState } from "../operations/operations.ts";
import type { RecoverableWork } from "./recoverableWork.ts";

/** Whether the work kept on the device has been loaded, before which nothing is written over it. */
export type RecoveryState = { isLoaded: boolean };

/**
 * Loads the work kept on the device when the app starts:
 * it lists the saves among the failed saves and sends the deletions and Undos again in the background.
 */
export const updateRecovery: FeatureUpdate<RecoveryState, "operations"> = (
  recovery,
  action,
  app,
) => {
  switch (action.type) {
    case "appStarted":
      return updated(recovery, { type: "loadRecoverableWork" });
    case "recoverableWorkLoaded":
      return updated(
        { isLoaded: true },
        ...restored(action.work, app.operations),
      );
    default:
      return updated(recovery);
  }
};

/** The recovery of flashcard work the app closed on, as a feature. */
export const recoveryFeature: Feature<RecoveryState, "operations"> = {
  initialState: { isLoaded: false },
  update: updateRecovery,
};

function restored(
  work: RecoverableWork | "unreadable",
  operations: OperationsState,
): Effect[] {
  if (work === "unreadable")
    return [
      show({
        tone: "danger",
        message:
          "Couldn't recover the flashcard changes that were not saved when the app last closed.",
        buttons: [],
        isTransient: false,
      }),
    ];
  return [
    ...work.saves.map((failed) => ({
      type: "keepFailedRequest" as const,
      failed,
    })),
    ...work.resends.map((request) =>
      sendFlashcardRequest(request, { operations }, "background"),
    ),
  ];
}
