import type { Action } from "redux";
import type { UpdateFunction } from "./update.ts";

export type EffectsReducer<S, E, Reads extends unknown[] = []> = {
  /** A Redux reducer that also passes on whatever else the update reads. */
  reducer: (state: S | undefined, action: Action, ...reads: Reads) => S;
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
export function createEffectsReducer<
  S,
  A extends Action,
  E,
  Reads extends unknown[] = [],
>(
  update: UpdateFunction<S, A, E, Reads>,
  initialState: S,
  isHandled: (action: Action) => action is A,
): EffectsReducer<S, E, Reads> {
  let queue: E[] = [];
  return {
    reducer: (state = initialState, action, ...reads) => {
      if (!isHandled(action)) return state;
      const [nextState, effects] = update(state, action, ...reads);
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
