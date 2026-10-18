import type { Effect } from "./effect.ts";
import type { Update } from "./update.ts";

/**
 * Pairs the next state with the effects to perform, typed as the union of every effect given.
 * Literals passed in keep their literal types, so a state or effect written inline needs no annotation.
 */
export const updated = <const S, const Es extends readonly Effect[]>(
  state: S,
  ...effects: Es
): Update<S, Es[number]> => [state, effects] as const;
