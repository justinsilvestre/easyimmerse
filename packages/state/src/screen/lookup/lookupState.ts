import type { Cue, LookupQuery } from "@easyimmerse/types";
import type { ReaderLocation } from "../../storedPlaces/readingLocation.ts";

/** What pointed at or activated a word. */
export type WordInput = "mouse" | "touch" | "keyboard";

/** A word to look up: as the pop-up shows it, and the query sent for it; null when no dictionary covers its language. */
export type LookupWord = { term: string; query: LookupQuery | null };

/** The passage a word was chosen in, which a flashcard made from it takes its sentence from. */
export type LookupSource =
  | { kind: "cue"; cue: Cue }
  /** A word of a book: its sentence, where it begins, and whether its script is written without spaces, for highlighting it. */
  | {
      kind: "text";
      sentence: string;
      location: ReaderLocation;
      isUnspaced: boolean;
    };

/** Where a word lies in the viewport, in CSS pixels, as `getBoundingClientRect` reports it. */
export type AnchorRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Where the pop-up stands: at a word element, by its DOM id, or beside a word's rectangle, as in the reader. */
export type LookupAnchor = { elementId: string } | { rect: AnchorRect };

/** One place of a word: its passage, named, and its offset there in UTF-16 code units. */
export type WordOccurrence = { passage: string; start: number };

/** A word chosen for the pop-up, with where it was chosen. */
export type ChosenWord = {
  word: LookupWord;
  source: LookupSource | null;
  /** This occurrence's place in its passage, which clicking again closes; null for a typed, linked or in-pop-up word. */
  occurrence: WordOccurrence | null;
  /** Null over the player's controls, as when the pop-up opens on its search field. */
  anchor: LookupAnchor | null;
};

/** The dictionary pop-up: open on a chosen word, or on its search field before anything is searched. */
export type LookupPopup = {
  mode: "word" | "search";
  chosen: ChosenWord | null;
};

/** A flashcard started from a word, waiting for the word's lookup. */
export type PendingFlashcard = {
  sequence: number;
  chosen: ChosenWord;
  /** Whether the flashcard is saved at once or opened in the editor. */
  destination: "save" | "editor";
  /** waiting: for at most `flashcardLookupWaitMs`; ready: the lookup answered or failed in time; late: the wait ran out first. */
  stage: "waiting" | "ready" | "late";
};

/** The dictionary pop-up of the media screen or the reader, and the flashcard that waits for a word's lookup. */
export type LookupState = {
  popup: LookupPopup | null;
  pendingFlashcard: PendingFlashcard | null;
  /** The sequence of the last flashcard started from a word on this screen. */
  lastFlashcardSequence: number;
  isPointerInside: boolean;
  /** Whether the pop-up paused playback, so that closing it resumes playback, unless the user has resumed it already. */
  pausedPlayback: boolean;
  /** Kept through closing and reopening while the screen is open. */
  size: "compact" | "expanded";
};

/** The lookup of a screen as it opens. */
export const initialLookup: LookupState = {
  popup: null,
  pendingFlashcard: null,
  lastFlashcardSequence: 0,
  isPointerInside: false,
  pausedPlayback: false,
  size: "compact",
};

/** Tells whether two occurrences are the same place in the same passage. */
export function isSameOccurrence(
  first: WordOccurrence | null | undefined,
  second: WordOccurrence | null | undefined,
): boolean {
  return (
    first != null &&
    second != null &&
    first.passage === second.passage &&
    first.start === second.start
  );
}
