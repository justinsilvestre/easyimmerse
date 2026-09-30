import type { Action } from "redux";
import type { ServerStoreParts } from "./createAppStore.ts";

export type FakeServerState = { mounted: true };

/** Builds trivial server store parts for tests. The middleware records every dispatched action. */
export function createFakeServerStoreParts(): ServerStoreParts & {
  dispatchedActions: Action[];
} {
  const dispatchedActions: Action[] = [];
  return {
    dispatchedActions,
    reducerPath: "fakeServer",
    reducer: (state: FakeServerState = { mounted: true }) => state,
    middleware: () => (next) => (action) => {
      dispatchedActions.push(action as Action);
      return next(action);
    },
  };
}
