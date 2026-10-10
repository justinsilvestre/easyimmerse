import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { moveCursor, withCursor } from "./lookupCursor.ts";
import {
  clickWord,
  close,
  dropPending,
  openSearch,
  setAside,
} from "./lookupMoves.ts";
import type { LookupPopup, LookupState, LookupWord } from "./lookupState.ts";
import { requestedFlashcard, startFlashcard } from "./startFlashcard.ts";
import { answerHover, hoverWord, isHoverSettle } from "./updateLookupCursor.ts";
import { updatePendingFlashcard } from "./updatePendingFlashcard.ts";

/**
 * Opens, moves and closes the dictionary pop-up, pausing playback while it is open and resuming it when it closes,
 * and starts flashcards from words once their lookups answer.
 * A click on the word shown closes the pop-up after the double-click interval, so that a double-click can still stop it.
 * Keeps the lookup cursor where the mouse or the keyboard points, with the length its word's lookup matched once a hover answers;
 * that answer also moves an open pop-up to the word, unless the pointer is inside the pop-up or a flashcard waits.
 * The L key acts on the cursor's word.
 * `app` is the state before the action.
 */
export function updateLookup(
  lookup: LookupState,
  action: AppAction,
  player: PlayerState,
  app: AppState,
) {
  switch (action.type) {
    case "lookupWordClicked":
      return clickWord(lookup, action.chosen, action.input, player);
    case "lookupFlashcardRequested":
    case "lookupCursorFlashcardRequested":
    case "lookupPopupWordHeld": {
      const pending = requestedFlashcard(lookup, action, app);
      return pending === null
        ? updated(lookup)
        : startFlashcard(lookup, pending, player);
    }
    case "lookupCursorMoved":
    case "lookupCursorLeft":
      return updated(withCursor(lookup, moveCursor(lookup.cursor, action)));
    case "lookupWordHovered":
      return hoverWord(lookup, action.chosen, player, app);
    case "lookupCursorLookedUp":
      return lookup.cursor === null
        ? openSearch(lookup, player)
        : clickWord(lookup, lookup.cursor.chosen, "keyboard", player);
    case "lookupSearchOpened":
      return openSearch(lookup, player);
    case "lookupTermSearched":
      return updated(searched(dropPending(lookup), action.word));
    case "lookupClosed":
    case "lookupCloseDue":
      return close(lookup);
    case "lookupSetAside":
      return setAside(dropPending(lookup));
    case "lookupPointerInsideChanged":
      return updated({ ...lookup, isPointerInside: action.isInside });
    case "lookupSizeToggled":
      return updated({
        ...lookup,
        size: lookup.size === "compact" ? "expanded" : "compact",
      } satisfies LookupState);
    case "playerPlayingChanged":
      return updated(
        action.isPlaying && lookup.pausedPlayback
          ? { ...lookup, pausedPlayback: false }
          : lookup,
      );
    case "requestSettled":
      return isHoverSettle(action)
        ? answerHover(lookup, action, player)
        : updated(lookup);
    case "flashcardFieldsWritten":
    case "lookupFlashcardWaitEnded":
      return updatePendingFlashcard(lookup, action, app);
    default:
      return updated(lookup);
  }
}

/** Shows a searched word at the place, and with the passage, of the word the pop-up opened on. A blank term changes nothing. */
function searched(lookup: LookupState, word: LookupWord): LookupState {
  if (word.term === "") return lookup;
  const shown = lookup.popup?.chosen;
  const popup: LookupPopup = {
    mode: lookup.popup?.mode ?? "search",
    chosen: {
      word,
      source: shown?.source ?? null,
      occurrence: null,
      anchor: shown?.anchor ?? null,
    },
  };
  return { ...lookup, popup };
}
