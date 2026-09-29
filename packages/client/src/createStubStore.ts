import { appActions } from "./state/appActions.ts";
import { createAppStore } from "./state/createAppStore.ts";

/**
 * Creates a store for tests and stories, in which no real side effects are carried out.
 *
 * @param serverUrl The address reported as the result of looking for the API server.
 */
export function createStubStore(serverUrl: string | null) {
  const store = createAppStore("web", {
    resolveServerUrl: (_effect, dispatch) =>
      dispatch(appActions.serverUrlResolved(serverUrl)),
  });
  store.dispatch(appActions.appStarted());
  return store;
}
