import type { AppState } from "../app/appState.ts";
import type { PerformedEffect } from "../app/effect.ts";
import { selectRecoverableWorkText } from "./recoverableWork.ts";

/** The side effects of the recovery: reading and keeping the recoverable work on the device. */
export type RecoveryEffect =
  | { type: "loadRecoverableWork" }
  | { type: "saveRecoverableWork"; text: string };

/** Keeps the recoverable work on the device whenever it changes, once the work kept earlier has been loaded. */
export function recoveryEffects(
  before: AppState,
  after: AppState,
): readonly PerformedEffect[] {
  if (before === after || !after.recovery.isLoaded) return [];
  // The selector remembers the text of `before` from the previous action, when that state was `after`.
  const text = selectRecoverableWorkText(after);
  const isSame =
    before.recovery.isLoaded && selectRecoverableWorkText(before) === text;
  return isSame ? [] : [{ type: "saveRecoverableWork", text }];
}
