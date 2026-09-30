import type { Action, Reducer } from "redux";
import type { Update } from "./update.ts";

export type EffectsReducer<S, E> = {
  reducer: Reducer<S, Action>;
  /** Removes and returns every effect queued since the previous drain. */
  drainEffects(): E[];
};

/**
 * Wraps an update function as a Redux reducer.
 *
 * The reducer stays pure with respect to state. The effects an update returns cannot travel
 * through Redux, so the reducer pushes them onto a private queue as its one deliberate side
 * channel. The effects middleware drains that queue after each dispatch.
 */
export function createEffectsReducer<S, A extends Action, E>(
  update: Update<S, A, E>,
  initialState: S,
  isHandled: (action: Action) => action is A,
): EffectsReducer<S, E> {
  let queue: E[] = [];
  return {
    reducer: (state = initialState, action) => {
      if (!isHandled(action)) return state;
      const [nextState, effects] = update(state, action);
      queue.push(...effects);
      return nextState;
    },
    drainEffects: () => {
      const drained = queue;
      queue = [];
      return drained;
    },
  };
}
