import type { Action, Middleware, Reducer, Store, StoreEnhancer } from "redux";
import {
  applyMiddleware,
  compose,
  legacy_createStore as createStore,
} from "redux";
import { watchBackupFaults } from "../backup/watchBackupFaults.ts";
import type { Effects } from "../platform/effects.ts";
import { pathOfAppLink } from "../route/pathOfAppLink.ts";
import { watchUnreachableRoute } from "../route/watchUnreachableRoute.ts";
import type { ServerCacheSlice } from "../server/cacheEntry.ts";
import type { RequestRunner } from "../server/serverRequest.ts";
import type { ServerConfig, ServerState } from "../server/serverState.ts";
import type { AppAction } from "./appAction.ts";
import { actions, isAppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import type { EffectsReducer } from "./createEffectsReducer.ts";
import { createEffectsReducer } from "./createEffectsReducer.ts";
import type { PerformedEffect } from "./effect.ts";
import { createEffectsMiddleware } from "./effectsMiddleware.ts";
import { initialAppState, update } from "./update.ts";

/** The reducer, middleware and request runner for server data, supplied by the backend package so that this package never imports it. */
export type ServerStoreParts = {
  /**
   * Keeps the server cache, which the store mounts under `serverCachePath`.
   * Written as a method so that a reducer of a fuller slice fits; the store only ever hands it back a slice it returned.
   */
  reducer(
    slice: ServerCacheSlice | undefined,
    action: Action,
  ): ServerCacheSlice;
  middleware: Middleware;
  /** Sends one request through the server data's store, so that the endpoint's cache rules apply as they do for any other caller. */
  runRequest: RequestRunner;
  /** The server the parts send requests to, or null when the app runs offline. */
  serverConfig: ServerConfig | null;
};

export type RootState = { app: AppState; backend: ServerCacheSlice };

/** The part of the root state that selectors of the app's slices alone read. */
export type AppRoot = Pick<RootState, "app">;

export type AppStore = Store<RootState, AppAction>;

export type AppDispatch = AppStore["dispatch"];

/** Combines store enhancers into one, as Redux's `compose` does. */
export type EnhancerComposer = (...enhancers: StoreEnhancer[]) => StoreEnhancer;

/**
 * Creates the app's store.
 * A composer other than Redux's own `compose`, such as one that connects developer tools, may wrap the store's enhancers.
 * The store opens Settings whenever the platform asks for them, follows the operating system's theme, and shows a notice each time the backup breaks, for as long as it lives.
 * It opens on the screen that the platform's address names, and moves to the screen of each address the browser's Back and Forward return to.
 * It opens the screen of each `easyimmerse://` link the platform opens the app with, as a new step from where the app is.
 * A screen opened from an address or a link which turns out to be unreachable gives way to the home screen.
 * `cloudUrl` is the address of the official easyImmerse server, which the app offers to log in to, or null while there is none.
 * Once created, it dispatches `appStarted`, which loads the stored preferences.
 */
export function createAppStore(
  effects: Effects,
  server: ServerStoreParts,
  cloudUrl: string | null = null,
  composeEnhancers: EnhancerComposer = compose,
): AppStore {
  const app = createEffectsReducer(
    update,
    initialStateWith({ config: server.serverConfig, cloudUrl }),
    isAppAction,
  );
  const store: AppStore = createStore(
    createRootReducer(app, server.reducer),
    composeEnhancers(
      applyMiddleware(
        createEffectsMiddleware(effects, server.runRequest, app.drainEffects),
        server.middleware,
      ),
    ),
  );
  effects.subscribeToSettingsRequests(() =>
    store.dispatch(actions.settingsRequested()),
  );
  effects.subscribeToSystemTheme((theme) =>
    store.dispatch(actions.systemThemeChanged(theme)),
  );
  watchBackupFaults(store);
  watchUnreachableRoute(store);
  effects.subscribeToLocation(({ path, previousPath }) =>
    store.dispatch(actions.locationOpened(path, previousPath)),
  );
  effects.subscribeToOpenedLinks((link) => {
    const path = pathOfAppLink(link);
    if (path !== null) store.dispatch(actions.linkOpened(path));
  });
  store.dispatch(actions.appStarted());
  return store;
}

/**
 * Lets the server reducer take the action first, then passes the server cache to the app's update, which reads it but never changes it.
 * Only the server's own actions change the cache, and the app's update ignores those, so the app sees the cache as it was before any action it handles.
 */
function createRootReducer(
  app: EffectsReducer<AppState, PerformedEffect, [ServerCacheSlice]>,
  serverReducer: ServerStoreParts["reducer"],
): Reducer<RootState, AppAction> {
  return (root, action) => {
    const backend = serverReducer(root?.backend, action);
    const appState = app.reducer(root?.app, action, backend);
    return root?.app === appState && root.backend === backend
      ? root
      : { app: appState, backend };
  };
}

/** The initial app state, with the servers the store was created for. */
function initialStateWith(server: ServerState): AppState {
  return { ...initialAppState, server };
}
