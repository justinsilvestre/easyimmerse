import { actions } from "../app/appAction.ts";
import type { EffectRunners } from "../app/runEffect.ts";
import { ignoreFailure } from "../platform/ignoreFailure.ts";
import {
  parseRecoverableSaves,
  recoverableSavesKey,
} from "./recoverableSaves.ts";
import type { RecoveryEffect } from "./recoveryEffects.ts";

/** Performs the recovery's effects. Saves that cannot be loaded at all count as none. */
export const recoveryEffectRunners = {
  loadRecoverableSaves: (_effect, { effects, dispatch }) => {
    effects
      .loadPreference(recoverableSavesKey)
      .catch(() => null)
      .then((stored) =>
        dispatch(actions.recoverableSavesLoaded(parseRecoverableSaves(stored))),
      );
  },
  saveRecoverableSaves: ({ text }, { effects }) => {
    effects.savePreference(recoverableSavesKey, text).catch(ignoreFailure);
  },
} satisfies EffectRunners<RecoveryEffect>;
