import { flashcardsEffectRunners } from "../flashcards/flashcardsEffectRunners.ts";
import { noticesEffectRunners } from "../notices/noticesEffectRunners.ts";
import type { Effects } from "../platform/effects.ts";
import { platformEffectRunners } from "../platform/platformEffectRunners.ts";
import { preferencesEffectRunners } from "../preferences/preferencesEffectRunners.ts";
import { screenEffectRunners } from "../screen/screenEffectRunners.ts";
import type { RequestTable } from "../server/requestTable.ts";
import { serverEffectRunners } from "../server/serverEffectRunners.ts";
import { storedPlacesEffectRunners } from "../storedPlaces/storedPlacesEffectRunners.ts";
import { timerEffectRunners } from "../timers/timerEffectRunners.ts";
import type { TimerTable } from "../timers/timerTable.ts";
import type { AppAction } from "./appAction.ts";
import { dispatchEffectRunners } from "./dispatchEffect.ts";
import type { PerformedEffect } from "./effect.ts";

/** What an effect runner may use: the platform's effects, the store's dispatch, and the store's pending timers and requests. */
export type EffectContext = {
  effects: Effects;
  dispatch: (action: AppAction) => void;
  timers: TimerTable;
  requests: RequestTable;
};

/** Performs one kind of effect. Effects that produce a result dispatch the corresponding action once it arrives. */
export type EffectRunner<E> = (effect: E, context: EffectContext) => void;

/** A runner for every type of a feature's effects. */
export type EffectRunners<E extends { type: string }> = {
  [T in E["type"]]: EffectRunner<Extract<E, { type: T }>>;
};

const effectRunners = {
  ...screenEffectRunners,
  ...preferencesEffectRunners,
  ...storedPlacesEffectRunners,
  ...flashcardsEffectRunners,
  ...noticesEffectRunners,
  ...platformEffectRunners,
  ...timerEffectRunners,
  ...serverEffectRunners,
  ...dispatchEffectRunners,
} satisfies EffectRunners<PerformedEffect>;

/** Performs one effect through the context's collaborators. */
export function runEffect(
  effect: PerformedEffect,
  context: EffectContext,
): void {
  const run = effectRunners[effect.type] as EffectRunner<PerformedEffect>;
  run(effect, context);
}
