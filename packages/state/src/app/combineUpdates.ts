import type { AppAction } from "./appAction.ts";
import type { Effect } from "./effect.ts";
import type { Update } from "./update.ts";
import { updated } from "./updated.ts";

/** Computes the next value of one field of a state, and the effects to perform, given the extra arguments of the combined update. */
export type FieldUpdate<F, Args extends readonly unknown[]> = (
  field: F,
  action: AppAction,
  ...args: Args
) => Update<F, Effect>;

/** The update of each field a combined update takes care of. */
export type UpdateTable<S, Args extends readonly unknown[]> = {
  readonly [K in keyof S]?: FieldUpdate<S[K], Args>;
};

/**
 * Combines the updates of a state's fields into one update of the state, as Redux's `combineReducers` does.
 * Every field's update sees the field as it was before the action, along with the same extra arguments,
 * and the effects are gathered in the table's order. Fields the table leaves out are kept as they are,
 * and the state keeps its reference when no field changes.
 */
export function combineUpdates<
  S extends object,
  Args extends readonly unknown[],
>(table: UpdateTable<S, Args>) {
  const names = Object.keys(table) as (keyof S)[];
  return (state: S, action: AppAction, ...args: Args): Update<S, Effect> => {
    let next = state;
    const effects: Effect[] = [];
    for (const name of names) {
      const update = table[name];
      if (update === undefined) continue;
      const [field, fieldEffects] = update(state[name], action, ...args);
      if (field !== state[name]) next = { ...next, [name]: field };
      effects.push(...fieldEffects);
    }
    return updated(next, ...effects);
  };
}
