import type { Action } from "redux";
import type { ServerConfig } from "../server/serverState.ts";
import type { ServerStoreParts } from "./createAppStore.ts";

type FakeServerState = { mounted: true };

/** Builds trivial server store parts for tests, for the given server if any. The middleware records every dispatched action. */
export function createFakeServerStoreParts(
  serverConfig: ServerConfig | null = null,
): ServerStoreParts & {
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
    serverConfig,
  };
}
