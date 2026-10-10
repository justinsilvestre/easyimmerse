import type { Effect } from "../../app/effect.ts";
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

/** The next lookup state and the effects that go with it. */
export type LookupStep = readonly [LookupState, readonly Effect[]];

/** Closes the pop-up after the double-click interval, so that the second click of a double-click can still stop it. */
export const startCloseTimer: Effect = {
  type: "startTimer",
  id: lookupTimerIds.close,
  ms: doubleClickMs,
  action: lookupActions.lookupCloseDue(),
};

export const cancelCloseTimer: Effect = {
  type: "cancelTimer",
  id: lookupTimerIds.close,
};

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
export function hold(lookup: LookupState, player: PlayerState): LookupStep {
  return player.isPlaying
    ? [{ ...lookup, pausedPlayback: true }, [{ type: "pausePlayer" }]]
    : [lookup, []];
}

/** Shows a word, as following the pointer does, keeping a waiting flashcard. */
export function show(
  lookup: LookupState,
  chosen: ChosenWord,
  player: PlayerState,
): LookupStep {
  const [held, effects] = hold(
    { ...lookup, popup: { mode: "word", chosen } },
    player,
  );
  return [held, [cancelCloseTimer, ...effects]];
}

/** Opens the pop-up on a word chosen outright, which drops a flashcard still waiting. */
export const open = (
  lookup: LookupState,
  chosen: ChosenWord,
  player: PlayerState,
): LookupStep => show(dropPending(lookup), chosen, player);

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
): LookupStep {
  if (!showsOccurrence(lookup, chosen)) return open(lookup, chosen, player);
  return input === "keyboard" ? close(lookup) : [lookup, [startCloseTimer]];
}

/** Opens the pop-up on its search field, which drops a flashcard still waiting. */
export function openSearch(
  lookup: LookupState,
  player: PlayerState,
): LookupStep {
  return hold(
    { ...dropPending(lookup), popup: { mode: "search", chosen: null } },
    player,
  );
}

/** Closes the pop-up, drops a waiting flashcard, and resumes playback if the pop-up paused it. */
export function close(lookup: LookupState): LookupStep {
  const resume: Effect[] = lookup.pausedPlayback
    ? [{ type: "playPlayer" }]
    : [];
  return [
    { ...dropPending(lookup), ...closedPopup, pausedPlayback: false },
    [cancelCloseTimer, ...resume],
  ];
}

/** Closes the pop-up for something that keeps playback paused, such as a flashcard. */
export function setAside(lookup: LookupState): LookupStep {
  return [
    { ...lookup, ...closedPopup, pausedPlayback: false },
    [cancelCloseTimer],
  ];
}

const closedPopup = { popup: null, isPointerInside: false } as const;
