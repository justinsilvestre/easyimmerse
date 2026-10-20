import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import { ignoreFailure } from "../platform/ignoreFailure.ts";
import { parseRecoverableWork, recoverableWorkKey } from "./recoverableWork.ts";
import type { RecoveryEffect } from "./recoveryEffects.ts";

/** Performs the recovery's effects in the device's own storage. Work that cannot be loaded at all counts as none. */
export const recoveryEffectRunners = {
  loadRecoverableWork: (_effect, { effects, dispatch }) => {
    effects
      .loadFromDevice(recoverableWorkKey)
      .catch(() => null)
      .then((stored) =>
        dispatch(actions.recoverableWorkLoaded(parseRecoverableWork(stored))),
      );
  },
  saveRecoverableWork: ({ text }, { effects }) => {
    effects.saveOnDevice(recoverableWorkKey, text).catch(ignoreFailure);
  },
} satisfies EffectRunners<RecoveryEffect>;
