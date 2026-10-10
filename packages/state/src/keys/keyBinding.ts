import type { AppAction } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import { selectLookup } from "../screen/lookup/lookupSelectors.ts";

/** A key pressed on a screen, with the facts about the page that only the browser knows. */
export type KeyPress = {
  /** The key as `KeyboardEvent.key` spells it, so " " is Space. */
  key: string;
  isShifted: boolean;
  /** Whether Ctrl or Cmd is held. */
  hasCommandKey: boolean;
  hasAltKey: boolean;
  /**
   * What has focus: a form field, which takes the keys it uses itself, such as a text box, a slider, a checkbox or a select;
   * an item of an open menu; a control that Space presses, such as a button or a link; or anything else on the page.
   */
  focus: "formField" | "menu" | "control" | "page";
  /** Whether a dialog is open over the page. Every dialog of the app is modal. */
  isDialogOpen: boolean;
  /** Whether the focused element has already handled the key. */
  isHandled: boolean;
};

/**
 * What a key does: an action the store handles alone,
 * or a command that the screen completes with data only it holds, such as the subtitles or the layout of a page.
 */
export type KeyBinding<Command> =
  | { kind: "action"; action: AppAction }
  | { kind: "command"; command: Command };

/** Binds a key to an action. */
export const bindAction = (action: AppAction) =>
  ({ kind: "action", action }) as const;

/** Binds a key to a command for the screen, one of the commands that `Command` lists. */
export const bindCommand = <Command>(command: Command) =>
  ({ kind: "command", command }) as const;

/** Tells whether the screen lies beneath Settings or under a modal dialog, where its keys do nothing. */
export function isScreenCovered(
  app: Pick<AppState, "route">,
  press: KeyPress,
): boolean {
  return app.route.screen === "settings" || press.isDialogOpen;
}

/**
 * Tells whether a key is free for the screen's own shortcuts:
 * pressed without Ctrl, Cmd or Alt, not handled already, and not pressed in a form field or a menu.
 */
export function isShortcutPress(press: KeyPress): boolean {
  return (
    !press.isHandled &&
    !press.hasCommandKey &&
    !press.hasAltKey &&
    press.focus !== "formField" &&
    press.focus !== "menu"
  );
}

/** Returns a letter key in lower case, so that Shift does not change its meaning, and any other key as it is. */
export function keyNameOf(press: KeyPress): string {
  return press.key.length === 1 ? press.key.toLowerCase() : press.key;
}

/**
 * Returns what Escape does while the dictionary pop-up is open, wherever focus is:
 * it makes an expanded pop-up compact, and closes a compact one. Returns null while the pop-up is closed.
 */
export function selectLookupEscapeBinding(app: Pick<AppState, "screen">) {
  const lookup = selectLookup(app);
  if (!lookup?.popup) return null;
  return bindAction(
    lookup.size === "expanded"
      ? lookupActions.lookupSizeToggled()
      : lookupActions.lookupClosed(),
  );
}
