import type { AppAction } from "../../app/appAction.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import {
  close,
  dropPending,
  hold,
  type LookupStep,
  open,
  setAside,
  show,
  showsOccurrence,
  startCloseTimer,
} from "./lookupMoves.ts";
import type {
  ChosenWord,
  LookupPopup,
  LookupState,
  LookupWord,
} from "./lookupState.ts";
import {
  startFlashcard,
  updatePendingFlashcard,
} from "./updatePendingFlashcard.ts";

/**
 * Opens, moves and closes the dictionary pop-up, pausing playback while it is open and resuming it when it closes,
 * and starts flashcards from words once their lookups answer.
 * A click on the word shown closes the pop-up after the double-click interval, so that a double-click can still stop it.
 * A word the pointer rests on moves an open pop-up, unless the pointer is inside it or a flashcard waits.
 * `requests` are the requests in flight, which flashcards' request ids must not repeat.
 */
export function updateLookup(
  lookup: LookupState,
  action: AppAction,
  player: PlayerState,
  requests: readonly { id: string }[],
): LookupStep {
  switch (action.type) {
    case "lookupWordClicked":
      if (!showsOccurrence(lookup, action.chosen))
        return open(lookup, action.chosen, player);
      return action.input === "keyboard"
        ? close(lookup)
        : [lookup, [startCloseTimer]];
    case "lookupWordRestedOn":
      return followsPointer(lookup, action.chosen)
        ? show(lookup, action.chosen, player)
        : [lookup, []];
    case "lookupFlashcardRequested":
      return startFlashcard(lookup, action, player, requests);
    case "lookupSearchOpened":
      return hold(
        { ...dropPending(lookup), popup: { mode: "search", chosen: null } },
        player,
      );
    case "lookupTermSearched":
      return [searched(dropPending(lookup), action.word), []];
    case "lookupClosed":
    case "lookupCloseDue":
      return close(lookup);
    case "lookupSetAside":
      return setAside(dropPending(lookup));
    case "lookupPointerInsideChanged":
      return [{ ...lookup, isPointerInside: action.isInside }, []];
    case "lookupSizeToggled":
      return [
        { ...lookup, size: lookup.size === "compact" ? "expanded" : "compact" },
        [],
      ];
    case "playerPlayingChanged":
      return [
        action.isPlaying && lookup.pausedPlayback
          ? { ...lookup, pausedPlayback: false }
          : lookup,
        [],
      ];
    case "requestSettled":
    case "lookupFlashcardWaitEnded":
    case "lookupFlashcardTaken":
      return updatePendingFlashcard(lookup, action);
    default:
      return [lookup, []];
  }
}

function followsPointer(lookup: LookupState, chosen: ChosenWord): boolean {
  return (
    lookup.popup?.mode === "word" &&
    !lookup.isPointerInside &&
    lookup.pendingFlashcard === null &&
    !showsOccurrence(lookup, chosen)
  );
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
