import type { Middleware, Reducer, Store } from "redux";
import {
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
} from "redux";
import type { AppAction } from "./actions.ts";
import { isAppAction } from "./actions.ts";
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

export function createAppStore(
  effects: Effects,
  server: ServerStoreParts,
): AppStore {
  const app = createEffectsReducer(update, initialAppState, isAppAction);
  const rootReducer: Reducer<RootState, AppAction> = combineReducers({
    app: app.reducer,
    [server.reducerPath]: server.reducer,
  });
  return createStore(
    rootReducer,
    applyMiddleware(
      createEffectsMiddleware(effects, app.drainEffects),
      server.middleware,
    ),
  );
}
