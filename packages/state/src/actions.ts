import type { Action } from "redux";
import { filePickActions } from "./filePick/filePickActions.ts";
import { flashcardEditorActions } from "./flashcardEditor/flashcardEditorActions.ts";
import { lookupActions } from "./lookup/lookupActions.ts";
import { navigationActions } from "./navigation/navigationActions.ts";
import { playerActions } from "./player/playerActions.ts";
import { preferenceActions } from "./preferences/preferenceActions.ts";
import { readerActions } from "./reader/readerActions.ts";
import { subtitleActions } from "./subtitles/subtitleActions.ts";
import { systemActions } from "./system/systemActions.ts";

/** Every action creator, keyed by the type of the action it creates. */
export const actions = {
  ...navigationActions,
  ...playerActions,
  ...subtitleActions,
  ...readerActions,
  ...lookupActions,
  ...flashcardEditorActions,
  ...filePickActions,
  ...preferenceActions,
  ...systemActions,
};

export type AppAction = ReturnType<(typeof actions)[keyof typeof actions]>;

/** Tells whether a Redux action is one of the app's own, as opposed to one from Redux itself or from another slice. */
export function isAppAction(action: Action): action is AppAction {
  return Object.hasOwn(actions, action.type);
}
