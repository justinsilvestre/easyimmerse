import type { Effect } from "./effect.ts";
import type { Update } from "./update.ts";

/** Pairs the next state with the effects to perform, typed as the union of every effect given. */
export const updated = <S, const Es extends readonly Effect[]>(
  state: S,
  ...effects: Es
): Update<S, Es[number]> => [state, effects] as const;
