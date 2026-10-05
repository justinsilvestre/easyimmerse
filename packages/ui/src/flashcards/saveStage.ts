/**
 * Where the open card stands on its way to being saved:
 * - `editing`: open for changes;
 * - `awaitingLookup`: a new card whose word's lookup has yet to answer, after the editor opened without it;
 * - `awaitingLookupToSave`: the same, with a save the user asked for waiting until the lookup answers, fails or takes too long;
 * - `readyToSend`: a save the user asked for, to be sent;
 * - `sending`: a save on its way, during which Save does nothing.
 */
export type SaveStage =
  | "editing"
  | "awaitingLookup"
  | "awaitingLookupToSave"
  | "readyToSend"
  | "sending";

/** Tells whether the card waits for its word's lookup, with or without a save. */
export function isAwaitingLookup(stage: SaveStage): boolean {
  return stage === "awaitingLookup" || stage === "awaitingLookupToSave";
}

/** Tells whether the user has pressed Save, from when on the editor is read-only, so that what is saved is what was shown. */
export function isLocked(stage: SaveStage): boolean {
  return (
    stage === "awaitingLookupToSave" ||
    stage === "readyToSend" ||
    stage === "sending"
  );
}

/** Tells whether a save is under way, after which nothing may change the card it sent. */
export function isSending(stage: SaveStage): boolean {
  return stage === "readyToSend" || stage === "sending";
}

/** The stage once the user asks to save: a save goes out now, or waits for the lookup; asking again changes nothing. */
export function stageAfterSaveRequest(stage: SaveStage): SaveStage {
  if (stage === "editing") return "readyToSend";
  if (stage === "awaitingLookup") return "awaitingLookupToSave";
  return stage;
}

/** The stage once the lookup has answered, failed or been given up: a save that waited for it goes out. */
export function stageAfterLookup(stage: SaveStage): SaveStage {
  return stage === "awaitingLookupToSave" ? "readyToSend" : "editing";
}

/** Tells the editor whether its save waits for definitions, is under way, or is free to ask for. */
export function saveStatusOf(
  stage: SaveStage,
): "idle" | "waitingForDefinitions" | "saving" {
  switch (stage) {
    case "editing":
    case "awaitingLookup":
      return "idle";
    case "awaitingLookupToSave":
      return "waitingForDefinitions";
    case "readyToSend":
    case "sending":
      return "saving";
  }
}
