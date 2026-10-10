/**
 * Where the open card stands on its way to being saved:
 * - `editing`: open for changes;
 * - `awaitingLookup`: a new card whose word's lookup has yet to answer, after the form opened without it;
 * - `awaitingLookupToSave`: the same, with a save the user asked for waiting until the lookup answers, fails or takes too long;
 * - `sending`: a save on its way, during which Save does nothing.
 */
export type SaveStage =
  | "editing"
  | "awaitingLookup"
  | "awaitingLookupToSave"
  | "sending";

/** Tells whether the card waits for its word's lookup, with or without a save. */
export function isAwaitingLookup(stage: SaveStage): boolean {
  return stage === "awaitingLookup" || stage === "awaitingLookupToSave";
}

/** Tells whether the user has pressed Save, from when on the form is read-only, so that what is saved is what was shown. */
export function isLocked(stage: SaveStage): boolean {
  return stage === "awaitingLookupToSave" || stage === "sending";
}

/** Tells the form whether its save waits for definitions, is under way, or is free to ask for. */
export function saveStatusOf(
  stage: SaveStage,
): "idle" | "waitingForDefinitions" | "saving" {
  switch (stage) {
    case "editing":
    case "awaitingLookup":
      return "idle";
    case "awaitingLookupToSave":
      return "waitingForDefinitions";
    case "sending":
      return "saving";
  }
}
