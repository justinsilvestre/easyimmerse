import type { Middleware, Reducer, Store, StoreEnhancer } from "redux";
import {
  applyMiddleware,
  combineReducers,
  compose,
  legacy_createStore as createStore,
} from "redux";
import type { AppAction } from "./actions.ts";
import { actions, isAppAction } from "./actions.ts";
import type { AppState } from "./appState.ts";
import { initialAppState } from "./appState.ts";
import { createEffectsReducer } from "./createEffectsReducer.ts";
import type { Effects } from "./effects.ts";
import { createEffectsMiddleware } from "./effectsMiddleware.ts";
import { update } from "./update.ts";

/** The reducer and middleware for server data, supplied by the backend package so that this package never imports it. */
export type ServerStoreParts = {
  reducerPath: string;
  reducer: Reducer;
  middleware: Middleware;
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
  const app = createEffectsReducer(update, initialAppState, isAppAction);
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
