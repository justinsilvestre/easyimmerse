import type { AppAction } from "./actions.ts";
import type { AppState } from "./appState.ts";
import type { Effect } from "./effect.ts";
import { filePickHandlers } from "./filePick/filePickHandlers.ts";
import { flashcardEditorHandlers } from "./flashcardEditor/flashcardEditorHandlers.ts";
import { lookupHandlers } from "./lookup/lookupHandlers.ts";
import { navigationHandlers } from "./navigation/navigationHandlers.ts";
import { playbackHandlers } from "./player/playbackHandlers.ts";
import { playerHandlers } from "./player/playerHandlers.ts";
import { preferenceHandlers } from "./preferences/preferenceHandlers.ts";
import { readerHandlers } from "./reader/readerHandlers.ts";
import { subtitleHandlers } from "./subtitles/subtitleHandlers.ts";
import { systemHandlers } from "./system/systemHandlers.ts";
import type { UpdateHandlers, UpdateResult } from "./updateHandlers.ts";

/** Computes the next state and the effects to perform in response to an action. */
export type Update<S, A, E> = (
  state: S,
  action: A,
) => readonly [S, readonly E[]];

const handlers: UpdateHandlers = {
  ...navigationHandlers,
  ...playerHandlers,
  ...playbackHandlers,
  ...subtitleHandlers,
  ...readerHandlers,
  ...lookupHandlers,
  ...flashcardEditorHandlers,
  ...filePickHandlers,
  ...preferenceHandlers,
  ...systemHandlers,
};

export const update: Update<AppState, AppAction, Effect> = (state, action) => {
  // TypeScript cannot relate a handler's action type to the action's own type, so the lookup is widened.
  const handle = handlers[action.type] as (
    state: AppState,
    action: AppAction,
  ) => UpdateResult;
  return handle(state, action);
};
