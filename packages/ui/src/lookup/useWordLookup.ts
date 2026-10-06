import type { DictionarySummary, LookupResult } from "@easyimmerse/types";
import { type ComponentProps, useId } from "react";
import type { WordHit } from "../components/useWordGestures.ts";
import type { AnchoredPopup } from "./AnchoredPopup.tsx";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import {
  flashcardFieldsFromLookup,
  type LookupFlashcardFields,
} from "./flashcardFieldsFromLookup.ts";
import type { LookupRequest } from "./lookupPopup.ts";
import { flashcardLookupWaitMs } from "./lookupTiming.ts";
import {
  type PopupHold,
  useLookupPopupControl,
} from "./useLookupPopupControl.ts";
import { withinTime } from "./withinTime.ts";

export type { PopupHold } from "./useLookupPopupControl.ts";

/**
 * Starts a flashcard for a word from its passage, with fields filled from its lookup when one answered,
 * or, through `lateFields`, once a lookup that was too slow to wait for answers.
 */
export type StartFlashcardFromLookup<S> = (
  word: string,
  source: S | null,
  lookupFields: LookupFlashcardFields | null,
  lateFields?: Promise<LookupFlashcardFields | null>,
) => void;

/** Stands for a lookup that has not answered within `flashcardLookupWaitMs`. */
const tooSlow = Symbol("too slow");

type Languages = { target: string; translation: string };

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
  languages: Languages;
  hold: PopupHold;
  startFlashcard: StartFlashcardFromLookup<S>;
}) {
  const control = useLookupPopupControl<S>(languages.target, hold);
  const { lookup } = control;
  const popupId = useId();
  const fieldsFrom = (
    results: readonly LookupResult[],
    entryIndex: number | null,
    dictionaries: readonly DictionarySummary[],
  ) => flashcardFieldsFromLookup(results, entryIndex, languages, dictionaries);
  const endInFlashcard = (
    word: string,
    source: S | null,
    lookupFields: LookupFlashcardFields | null,
    lateFields?: Promise<LookupFlashcardFields | null>,
  ) =>
    control.leaveFor(() =>
      startFlashcard(
        lookupFields?.word ?? word,
        source,
        lookupFields,
        lateFields,
      ),
    );
  /** Turns a word into a flashcard once its lookup answers, showing the word in the pop-up meanwhile when it comes from the text. */
  const startFlashcardFor = (request: LookupRequest<S>) => {
    control.keepOpen();
    if (request.occurrence !== null && !control.showsOccurrence(request))
      control.open(request);
    const { dictionaries } = lookup;
    const fieldsOf = (results: readonly LookupResult[] | null) =>
      results && fieldsFrom(results, null, dictionaries);
    const answer = lookup.lookUp(request);
    control.pending.start(
      request.term,
      withinTime<readonly LookupResult[] | null | typeof tooSlow>(
        answer,
        flashcardLookupWaitMs,
        tooSlow,
      ),
      (results) =>
        results === tooSlow
          ? endInFlashcard(
              request.term,
              request.source,
              null,
              answer.then(fieldsOf),
            )
          : endInFlashcard(request.term, request.source, fieldsOf(results)),
    );
  };
  return {
    popup: popupOf(control, popupId, {
      onWordFlashcard: (term) => startFlashcardFor(wordInPopup(control, term)),
      onCreateFlashcard: (entryIndex) =>
        endInFlashcard(
          lookup.request?.term ?? "",
          lookup.request?.source ?? null,
          fieldsFrom(lookup.results, entryIndex, lookup.dictionaries),
        ),
    }),
    /**
     * The occurrence the pop-up shows, if it shows a word from the text, with the pop-up's id,
     * and the length of the text its best result matched, once the lookup has answered.
     */
    activeOccurrence: lookup.request?.occurrence && {
      ...lookup.request.occurrence,
      source: lookup.request.source,
      popupId,
      length: lookup.results[0]?.matchedText.length,
    },
    /** A word clicked or tapped in the text. */
    clickWord: (request: LookupRequest<S>, input: WordHit["input"]) => {
      if (!control.showsOccurrence(request)) return control.open(request);
      // A click or tap may begin a double-click or double tap, whose second half must find the pop-up still open.
      if (input === "keyboard") control.close();
      else control.closeSoon();
    },
    /** A word the mouse rests on in the text. */
    hoverWord: (request: LookupRequest<S>) => {
      const followsPointer =
        lookup.popup?.mode === "word" &&
        !control.isPointerInside.current &&
        !control.pending.isPending();
      if (followsPointer && !control.showsOccurrence(request))
        control.show(request);
    },
    /** The passage of the word the pop-up opened on, kept while it looks up words inside it; null when it opened on its search field. */
    shownSource: lookup.request?.source ?? null,
    startFlashcardFor,
    openSearch: control.openSearch,
    close: control.close,
    leaveFor: control.leaveFor,
  };
}

type Control<S> = ReturnType<typeof useLookupPopupControl<S>>;

/** A word inside the pop-up, looked up from its passage and shown at the same place. */
function wordInPopup<S>(control: Control<S>, term: string): LookupRequest<S> {
  const shown = control.lookup.request;
  return {
    term,
    lookup: { text: term },
    source: shown?.source ?? null,
    occurrence: null,
    anchor: shown?.anchor ?? null,
  };
}

/** The props of the pop-up and of the wrapper that places it, or null while it is closed. */
function popupOf<S>(
  control: Control<S>,
  popupId: string,
  flashcards: {
    onWordFlashcard: (term: string) => void;
    onCreateFlashcard: (entryIndex: number | null) => void;
  },
): {
  anchored: Omit<ComponentProps<typeof AnchoredPopup>, "children">;
  props: Omit<ComponentProps<typeof DictionaryPopup>, "onSetUpDictionary">;
} | null {
  const { lookup, pending } = control;
  if (lookup.popup === null) return null;
  return {
    anchored: {
      anchor:
        lookup.popup.mode === "word" ? (lookup.request?.anchor ?? null) : null,
      onPointerInsideChange: (isInside) => {
        control.isPointerInside.current = isInside;
      },
    },
    props: {
      id: popupId,
      state: lookup.state,
      mode: lookup.popup.mode,
      resolveMediaUrl: lookup.resolveMediaUrl,
      pendingFlashcard: pending.term,
      onSearch: control.search,
      wordActions: {
        onFlashcard: flashcards.onWordFlashcard,
        onLookupStarted: (term) => lookup.prefetch(wordInPopup(control, term)),
      },
      onCreateFlashcard: flashcards.onCreateFlashcard,
      onClose: control.close,
    },
  };
}
