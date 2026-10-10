import type { Effects } from "../platform/effects.ts";
import { platformEffectRunners } from "../platform/platformCommands.ts";
import { preferencesEffectRunners } from "../preferences/preferencesEffectRunners.ts";
import { screenEffectRunners } from "../screen/screenEffectRunners.ts";
import { storedPlacesEffectRunners } from "../storedPlaces/storedPlacesEffectRunners.ts";
import { unsavedWorkEffectRunners } from "../unsavedWork/unsavedWork.ts";
import type { AppAction } from "./appAction.ts";
import type { Effect } from "./effect.ts";

/** Performs one kind of effect. Effects that produce a result dispatch the corresponding action once it arrives. */
export type EffectRunner<E> = (
  effect: E,
  effects: Effects,
  dispatch: (action: AppAction) => void,
) => void;

/** A runner for every type of a feature's effects. */
export type EffectRunners<E extends { type: string }> = {
  [T in E["type"]]: EffectRunner<Extract<E, { type: T }>>;
};

const effectRunners = {
  ...screenEffectRunners,
  ...preferencesEffectRunners,
  ...storedPlacesEffectRunners,
  ...unsavedWorkEffectRunners,
  ...platformEffectRunners,
} satisfies EffectRunners<Effect>;

/** Performs one effect through the platform's effects. */
export function runEffect(
  effect: Effect,
  effects: Effects,
  dispatch: (action: AppAction) => void,
): void {
  const run = effectRunners[effect.type] as EffectRunner<Effect>;
  run(effect, effects, dispatch);
}
