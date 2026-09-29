import {
  applyMiddleware,
  combineReducers,
  legacy_createStore as createStore,
  type Dispatch,
  type Store,
} from "redux";
import { thunk } from "redux-thunk";
import {
  type AppState,
  createInitialAppState,
  type Platform,
} from "./AppState.ts";
import type { AppAction } from "./appActions.ts";
import { createEffectsMiddleware } from "./createEffectsMiddleware.ts";
import type { EffectsRunners } from "./effects.ts";
import { serverApi } from "./serverApi.ts";
import { updateApp } from "./updateApp.ts";

export type RootState = {
  app: AppState;
  [serverApi.reducerPath]: ReturnType<typeof serverApi.reducer>;
};
export type AppDispatch = Dispatch<AppAction>;
export type AppStore = Store<RootState, AppAction>;

/**
 * Creates the store holding all state of the app.
 *
 * @param effectsRunners The functions carrying out side effects on the given platform.
 */
export function createAppStore(
  platform: Platform,
  effectsRunners: EffectsRunners,
): AppStore {
  const initialState = createInitialAppState(platform);
  const reduceRoot = combineReducers({
    app: (state: AppState = initialState, action: AppAction) =>
      updateApp(state, action)[0],
    [serverApi.reducerPath]: serverApi.reducer,
  });
  // The thunk middleware is required by RTK Query, which dispatches functions internally.
  const middleware = applyMiddleware<object, RootState>(
    thunk,
    createEffectsMiddleware(effectsRunners),
    serverApi.middleware,
  );
  return createStore(reduceRoot, undefined, middleware) as AppStore;
}
