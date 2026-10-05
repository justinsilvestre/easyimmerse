import type { DictionarySummary } from "@easyimmerse/types";
import { type ComponentProps, useEffect, useId, useRef } from "react";
import type { AnchoredPopup } from "./AnchoredPopup.tsx";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import {
  flashcardFieldsFromLookup,
  type LookupFlashcardFields,
} from "./flashcardFieldsFromLookup.ts";
import { isSameOccurrence, type LookupRequest } from "./lookupPopup.ts";
import { useDictionaryLookup } from "./useDictionaryLookup.ts";

/** Starts a flashcard for a word from its passage, with fields filled from its lookup when one answered. */
export type StartFlashcardFromLookup<S> = (
  word: string,
  source: S | null,
  lookupFields: LookupFlashcardFields | null,
) => void;

/** Holds something, such as playback, while the pop-up is open, and lets it go when the pop-up closes or leads on elsewhere. */
export type PopupHold = {
  /** Called whenever the pop-up opens on a word. */
  hold(): void;
  /** Called when the pop-up closes with nothing to follow. */
  release(): void;
  /** Called when the pop-up gives way to something that keeps the hold, such as the flashcard editor. */
  forget(): void;
};

/** About the double-click interval of common systems, so that the second click of a double-click can cancel a close. */
const closeDelayMs = 300;
/** How long a flashcard waits for its word's lookup before it opens with what has arrived. */
export const flashcardLookupWaitMs = 1500;

type Timer = ReturnType<typeof setTimeout> | undefined;

/**
 * Drives the dictionary pop-up for words in a text, such as subtitles or an ebook:
 * a click opens it at the word, or closes it when it shows that word already;
 * hover intent moves it to another word, unless the pointer is inside it;
 * and a double-click or held tap turns the word into a flashcard filled from its lookup.
 * Words inside the pop-up are looked up in it, or turned into flashcards the same way.
 * `S` is the kind of passage words come from, such as a subtitle cue.
 */
export function useWordLookup<S>({
  languages,
  hold,
  startFlashcard,
}: {
  languages: { target: string; translation: string };
  hold: PopupHold;
  startFlashcard: StartFlashcardFromLookup<S>;
}) {
  const lookup = useDictionaryLookup<S>(languages.target);
  const closeTimer = useRef<Timer>(undefined);
  const isPointerInside = useRef(false);
  /** Counts what the user has done since, so that a flashcard waiting for its lookup can tell it was overtaken. */
  const version = useRef(0);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const popupId = useId();
  const showsOccurrence = (request: LookupRequest<S>) =>
    lookup.popup !== null &&
    isSameOccurrence(lookup.request?.occurrence, request.occurrence);
  const open = (request: LookupRequest<S>) => {
    clearTimeout(closeTimer.current);
    version.current += 1;
    hold.hold();
    lookup.chooseWord(request);
  };
  const close = () => {
    clearTimeout(closeTimer.current);
    version.current += 1;
    isPointerInside.current = false;
    lookup.close();
    hold.release();
  };
  const leaveFor = (next: () => void) => {
    version.current += 1;
    lookup.close();
    hold.forget();
    next();
  };
  const endInFlashcard = (
    word: string,
    source: S | null,
    lookupFields: LookupFlashcardFields | null,
  ) =>
    leaveFor(() =>
      startFlashcard(lookupFields?.word ?? word, source, lookupFields),
    );
  const fieldsFrom = (
    results: Parameters<typeof flashcardFieldsFromLookup>[0],
    entryIndex: number | null,
    dictionaries: readonly DictionarySummary[],
  ) => flashcardFieldsFromLookup(results, entryIndex, languages, dictionaries);
  /** Turns a word into a flashcard once its lookup answers, showing the word in the pop-up meanwhile when it comes from the text. */
  const startFlashcardFor = (request: LookupRequest<S>) => {
    clearTimeout(closeTimer.current);
    if (request.occurrence !== null && !showsOccurrence(request)) open(request);
    const started = version.current;
    const { dictionaries } = lookup;
    lookup.lookUpNow(request, flashcardLookupWaitMs).then((results) => {
      if (version.current !== started) return;
      endInFlashcard(
        request.term,
        request.source,
        fieldsFrom(results, null, dictionaries),
      );
    });
  };
  /** A word clicked or tapped in the text. */
  const clickWord = (request: LookupRequest<S>, isKeyboard: boolean) => {
    if (!showsOccurrence(request)) return open(request);
    // A pointer click may begin a double-click, whose second click must find the pop-up still open.
    if (isKeyboard) close();
    else closeTimer.current = setTimeout(close, closeDelayMs);
  };
  /** A word the mouse rests on in the text. */
  const hoverWord = (request: LookupRequest<S>) => {
    const followsPointer =
      lookup.popup?.mode === "word" && !isPointerInside.current;
    if (followsPointer && !showsOccurrence(request)) open(request);
  };
  const wordInPopup = (term: string): LookupRequest<S> => ({
    term,
    lookup: { text: term },
    source: lookup.request?.source ?? null,
    occurrence: null,
    anchor: lookup.request?.anchor ?? null,
  });
  const popup: {
    anchored: Omit<ComponentProps<typeof AnchoredPopup>, "children">;
    props: Omit<ComponentProps<typeof DictionaryPopup>, "onSetUpDictionary">;
  } | null = lookup.popup && {
    anchored: {
      anchor:
        lookup.popup.mode === "word" ? (lookup.request?.anchor ?? null) : null,
      onPointerInsideChange: (isInside) => {
        isPointerInside.current = isInside;
      },
    },
    props: {
      id: popupId,
      state: lookup.state,
      mode: lookup.popup.mode,
      resolveMediaUrl: lookup.resolveMediaUrl,
      onSearch: lookup.search,
      onWordFlashcard: (term) => startFlashcardFor(wordInPopup(term)),
      onCreateFlashcard: (entryIndex) =>
        endInFlashcard(
          lookup.request?.term ?? "",
          lookup.request?.source ?? null,
          fieldsFrom(lookup.results, entryIndex, lookup.dictionaries),
        ),
      onClose: close,
    },
  };
  return {
    popup,
    /** The occurrence the pop-up shows, if it shows a word from the text, with the pop-up's id. */
    activeOccurrence: lookup.request?.occurrence && {
      ...lookup.request.occurrence,
      source: lookup.request.source,
      popupId,
    },
    clickWord,
    hoverWord,
    startFlashcardFor,
    openSearch: () => {
      hold.hold();
      version.current += 1;
      lookup.openSearch();
    },
    leaveFor,
  };
}
