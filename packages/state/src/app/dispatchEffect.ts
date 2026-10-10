import type { AppAction } from "./appAction.ts";
import type { EffectRunners } from "./runEffect.ts";

/** Dispatches an action once the update that returned it is done, so that an update can announce what it decided. */
export type DispatchEffect = { type: "dispatch"; action: AppAction };

/** Describes the dispatch of an action after the current update. */
export const dispatch = (action: AppAction) =>
  ({ type: "dispatch", action }) satisfies DispatchEffect;

/** Performs the dispatch effect through the store's dispatch. */
export const dispatchEffectRunners = {
  dispatch: ({ action }, context) => context.dispatch(action),
} satisfies EffectRunners<DispatchEffect>;
