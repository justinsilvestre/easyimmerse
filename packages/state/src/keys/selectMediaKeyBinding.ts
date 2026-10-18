import type { AppState } from "../app/appState.ts";
import type { FlashcardDestination } from "../flashcards/flashcardActions.ts";
import { preferencesActions } from "../preferences/preferencesActions.ts";
import { lookupActions } from "../screen/lookup/lookupActions.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { screenActions } from "../screen/screenActions.ts";
import {
  bindAction,
  bindCommand,
  isScreenCovered,
  isShortcutPress,
  type KeyPress,
  keyNameOf,
  selectLookupEscapeBinding,
} from "./keyBinding.ts";

/** What the media screen completes with data only it holds: the cues' translations, the drafts of flashcards, and the fullscreen state. */
type MediaKeyCommand =
  | { type: "toggleFullscreen" }
  | { type: "startFlashcardAtCursor"; destination: FlashcardDestination }
  /** Shows the translation of the current cue in the dictionary pop-up's sentence row, or hides it again. */
  | { type: "toggleSentenceTranslation" };

/**
 * Returns what a key does on the media screen, or null to leave it to the browser.
 * Space or K plays and pauses, Left and Right skip to the previous and next cue, R replays the cue shown now, M mutes,
 * and F fills the screen. L looks up from the lookup cursor, C saves a flashcard from it,
 * and E opens that flashcard in the editor instead, unless a card is open there already.
 * T shows the translation of the cursor's cue, or of the cue shown now, in the dictionary pop-up's sentence row, or hides it again.
 * Escape makes the dictionary pop-up compact, or closes it.
 * Space is left to a focused control, and every key to Settings or a modal dialog over the screen.
 */
export function selectMediaKeyBinding(
  app: Pick<AppState, "route" | "screen">,
  press: KeyPress,
) {
  if (isScreenCovered(app, press)) return null;
  if (press.key === "Escape") return selectLookupEscapeBinding(app);
  if (!isShortcutPress(press)) return null;
  switch (keyNameOf(press)) {
    case " ":
      return press.focus === "control"
        ? null
        : bindAction(screenActions.playToggleRequested());
    case "k":
      return bindAction(screenActions.playToggleRequested());
    case "ArrowLeft":
      return bindAction(screenActions.cueSkipRequested("back"));
    case "ArrowRight":
      return bindAction(screenActions.cueSkipRequested("forward"));
    case "r":
      return bindAction(screenActions.cueReplayRequested());
    case "m":
      return bindAction(preferencesActions.muteToggleRequested());
    case "f":
      return bindCommand<MediaKeyCommand>({ type: "toggleFullscreen" });
    case "l":
      return bindAction(lookupActions.lookupCursorLookedUp());
    case "c":
      // Works while a card is open in the editor, too.
      return bindCommand<MediaKeyCommand>({
        type: "startFlashcardAtCursor",
        destination: "save",
      });
    case "e":
      return selectFlashcardForm(app) === null
        ? bindCommand<MediaKeyCommand>({
            type: "startFlashcardAtCursor",
            destination: "editor",
          })
        : null;
    case "t":
      return bindCommand<MediaKeyCommand>({
        type: "toggleSentenceTranslation",
      });
    default:
      return null;
  }
}
