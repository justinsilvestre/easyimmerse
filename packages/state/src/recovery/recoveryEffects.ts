import type { AppState } from "../app/appState.ts";
import type { PerformedEffect } from "../app/effect.ts";
import { selectRecoverableSavesText } from "./recoverableSaves.ts";

/** The side effects of the recovery: reading and keeping the recoverable saves on the device. */
export type RecoveryEffect =
  | { type: "loadRecoverableSaves" }
  | { type: "saveRecoverableSaves"; text: string };

/** Keeps the recoverable saves on the device whenever they change, once those kept earlier have been loaded. */
export function recoveryEffects(
  before: AppState,
  after: AppState,
): readonly PerformedEffect[] {
  if (before === after || !after.recovery.isLoaded) return [];
  // The selector remembers the text of `before` from the previous action, when that state was `after`.
  const text = selectRecoverableSavesText(after);
  const isSame =
    before.recovery.isLoaded && selectRecoverableSavesText(before) === text;
  return isSame ? [] : [{ type: "saveRecoverableSaves", text }];
}
