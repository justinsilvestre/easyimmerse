import type { EffectRunners } from "../app/runEffect.ts";
import type { TimerEffect } from "./timerEffect.ts";

/** Performs the timer effects through the store's timer table. */
export const timerEffectRunners = {
  startTimer: (effect, { dispatch, timers }) =>
    timers.start(effect.id, effect.ms, () => dispatch(effect.action)),
  cancelTimer: (effect, { timers }) => timers.cancel(effect.id),
} satisfies EffectRunners<TimerEffect>;
