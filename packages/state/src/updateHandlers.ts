import type { AppAction } from "./actions.ts";
import type { AppState } from "./appState.ts";
import type { Effect } from "./effect.ts";

/** The next state and the effects to perform. */
export type UpdateResult = readonly [AppState, readonly Effect[]];

/** One update function per action type, each receiving only actions of its type. */
export type UpdateHandlers = {
  [T in AppAction["type"]]: (
    state: AppState,
    action: Extract<AppAction, { type: T }>,
  ) => UpdateResult;
};
