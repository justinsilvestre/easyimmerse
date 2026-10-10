import type { Middleware, Reducer, Store, StoreEnhancer } from "redux";
import {
  applyMiddleware,
  combineReducers,
  compose,
  legacy_createStore as createStore,
} from "redux";
import type { Effects } from "../platform/effects.ts";
import type { ServerConfig } from "../server/serverState.ts";
import type { AppAction } from "./appAction.ts";
import { actions, isAppAction } from "./appAction.ts";
import type { AppState } from "./appState.ts";
import { createEffectsReducer } from "./createEffectsReducer.ts";
import { createEffectsMiddleware } from "./effectsMiddleware.ts";
import { initialAppState, update } from "./update.ts";

/** The reducer and middleware for server data, supplied by the backend package so that this package never imports it. */
export type ServerStoreParts = {
  reducerPath: string;
  reducer: Reducer;
  middleware: Middleware;
  /** The server the parts send requests to, or null when the app runs offline. */
  serverConfig: ServerConfig | null;
};

export type RootState = { app: AppState } & Record<string, unknown>;

export type AppStore = Store<RootState, AppAction>;

export type AppDispatch = AppStore["dispatch"];

/** Combines store enhancers into one, as Redux's `compose` does. */
export type EnhancerComposer = (...enhancers: StoreEnhancer[]) => StoreEnhancer;

/**
 * Creates the app's store.
 * A composer other than Redux's own `compose`, such as one that connects developer tools, may wrap the store's enhancers.
 * The store opens Settings whenever the platform asks for them, for as long as it lives.
 */
export function createAppStore(
  effects: Effects,
  server: ServerStoreParts,
  composeEnhancers: EnhancerComposer = compose,
): AppStore {
  const app = createEffectsReducer(
    update,
    initialStateWith(server.serverConfig),
    isAppAction,
  );
  const rootReducer: Reducer<RootState, AppAction> = combineReducers({
    app: app.reducer,
    [server.reducerPath]: server.reducer,
  });
  const store: AppStore = createStore(
    rootReducer,
    composeEnhancers(
      applyMiddleware(
        createEffectsMiddleware(effects, app.drainEffects),
        server.middleware,
      ),
    ),
  );
  effects.subscribeToSettingsRequests(() =>
    store.dispatch(actions.settingsRequested()),
  );
  return store;
}

/** The initial app state, with the server the store was created for. */
function initialStateWith(serverConfig: ServerConfig | null): AppState {
  return { ...initialAppState, server: { config: serverConfig } };
}
