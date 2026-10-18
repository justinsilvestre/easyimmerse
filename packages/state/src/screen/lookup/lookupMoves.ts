import type { Effect } from "../../app/effect.ts";
import { updated } from "../../app/updated.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import { lookupActions } from "./lookupActions.ts";
import { lookupTimerIds } from "./lookupIds.ts";
import {
  type ChosenWord,
  isSameOccurrence,
  type LookupState,
  type WordInput,
} from "./lookupState.ts";
import { doubleClickMs } from "./lookupTiming.ts";

/** Closes the pop-up after the double-click interval, so that the second click of a double-click can still stop it. */
export const startCloseTimer = {
  type: "startTimer",
  id: lookupTimerIds.close,
  ms: doubleClickMs,
  action: lookupActions.lookupCloseDue(),
} satisfies Effect;

export const cancelCloseTimer = {
  type: "cancelTimer",
  id: lookupTimerIds.close,
} satisfies Effect;

/** Tells whether the pop-up is open on this occurrence of a word. */
export function showsOccurrence(
  lookup: LookupState,
  chosen: ChosenWord,
): boolean {
  return (
    lookup.popup !== null &&
    isSameOccurrence(lookup.popup.chosen?.occurrence, chosen.occurrence)
  );
}

/** Pauses playing playback for the open pop-up, and remembers that it did. A paused player is left alone. */
export function hold(lookup: LookupState, player: PlayerState) {
  return player.isPlaying
    ? updated({ ...lookup, pausedPlayback: true }, { type: "pausePlayer" })
    : updated(lookup);
}

/** Shows a word, as following the pointer does, keeping a waiting flashcard. */
export function show(
  lookup: LookupState,
  chosen: ChosenWord,
  player: PlayerState,
) {
  const [held, effects] = hold(
    { ...lookup, popup: { mode: "word", chosen } },
    player,
  );
  return updated(held, cancelCloseTimer, ...effects);
}

/** Opens the pop-up on a word chosen outright, which drops a flashcard still waiting. */
export const open = (
  lookup: LookupState,
  chosen: ChosenWord,
  player: PlayerState,
) => show(dropPending(lookup), chosen, player);

/** Lets go of a flashcard still waiting for its word's lookup, which the flashcards then keep waiting for it. */
export function dropPending(lookup: LookupState): LookupState {
  return lookup.pendingFlashcard === null
    ? lookup
    : { ...lookup, pendingFlashcard: null };
}

/** Opens the pop-up on a word clicked, tapped or activated, or closes it when it shows that word already. */
export function clickWord(
  lookup: LookupState,
  chosen: ChosenWord,
  input: WordInput,
  player: PlayerState,
) {
  if (!showsOccurrence(lookup, chosen)) return open(lookup, chosen, player);
  return input === "keyboard"
    ? close(lookup)
    : updated(lookup, startCloseTimer);
}

/** Opens the pop-up on its search field, which drops a flashcard still waiting. */
export function openSearch(lookup: LookupState, player: PlayerState) {
  return hold(
    { ...dropPending(lookup), popup: { mode: "search", chosen: null } },
    player,
  );
}

/** Closes the pop-up, drops a waiting flashcard, and resumes playback if the pop-up paused it. */
export function close(lookup: LookupState) {
  const closed = {
    ...dropPending(lookup),
    ...closedPopup,
    pausedPlayback: false,
  };
  return lookup.pausedPlayback
    ? updated(closed, cancelCloseTimer, { type: "playPlayer" })
    : updated(closed, cancelCloseTimer);
}

/** Closes the pop-up for something that keeps playback paused, such as a flashcard. */
export function setAside(lookup: LookupState) {
  return updated(
    { ...lookup, ...closedPopup, pausedPlayback: false },
    cancelCloseTimer,
  );
}

const closedPopup = { popup: null, isPointerInside: false } as const;
