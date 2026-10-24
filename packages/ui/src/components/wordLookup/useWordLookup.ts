import {
  actions,
  type ChosenWord,
  type FlashcardDestination,
  type LookupSource,
  selectLookup,
} from "@easyimmerse/state";
import { useId } from "react";
import { useAppDispatch } from "../../useAppDispatch.ts";
import { useAppSelector } from "../../useAppSelector.ts";
import { useAppStore } from "../../useAppStore.ts";
import {
  lookupPopupProps,
  matchedLengthOf,
} from "../dictionaryPopup/lookupPopupProps.ts";
import type { SentenceRowProps } from "../dictionaryPopup/SentenceRow.tsx";
import type { SentenceRowSource } from "../dictionaryPopup/sentenceRowSource.ts";
import { sentenceTranslationActionOf } from "../dictionaryPopup/sentenceTranslationActionOf.ts";
import { useLookupDisplay } from "../dictionaryPopup/useLookupDisplay.ts";
import type { LookupPlace } from "./lookupPlace.ts";
import { lookupWordOf } from "./lookupWordOf.ts";
import { useLookupFlashcards } from "./useLookupFlashcards.ts";
import type { WordHit } from "./useWordGestures.ts";
import type { WordFlashcards } from "./wordFlashcards.ts";

/**
 * Drives the dictionary pop-up for words in a text, such as subtitles or an ebook, through the screen's lookup in the store:
 * a click opens it at the word, or closes it when it shows that word already;
 * a held tap or held mouse button opens it with its sentence row's translation shown, when the word's sentence has one to show;
 * and a double-click turns the word into a flashcard filled from its lookup, made as `flashcards` says.
 * Words inside the pop-up are looked up in it with a double-click, or turned into flashcards with a held tap.
 * The pop-up's sentence row is filled from `sentence`, as the screen knows the sentences or cues.
 */
export function useWordLookup(
  languages: { target: string; translation: string },
  flashcards: WordFlashcards,
  sentence: SentenceRowSource,
) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const lookup = useAppSelector((state) => selectLookup(state.app));
  const display = useLookupDisplay(lookup?.popup ?? null, languages.target);
  const popupId = useId();
  const chosen = lookup?.popup?.chosen ?? null;
  const made = useLookupFlashcards(flashcards, chosen, {
    languages,
    dictionaries: display.dictionaries,
  });
  const wordOf = (term: string, text: Parameters<typeof lookupWordOf>[1]) =>
    lookupWordOf(term, text, languages.target, display.isCovered);
  const hasTranslationOf = (source: LookupSource | null) =>
    sentence.factsOf(source).translation !== null;
  const row = sentenceRowOf(
    sentence,
    chosen?.source ?? null,
    lookup?.isSentenceTranslationShown ?? false,
    () => dispatch(actions.lookupSentenceTranslationToggled()),
  );
  return {
    popup: lookupPopupProps(lookup, popupId, display, {
      onSearch: (term) => {
        const trimmed = term.trim();
        dispatch(
          actions.lookupTermSearched(wordOf(trimmed, { text: trimmed })),
        );
      },
      onWordHold: made.holdWord,
      onCreateFlashcard: (entryIndex) =>
        made.createFromPopup(display.results, entryIndex),
      sentence: row,
      onClose: () => dispatch(actions.lookupClosed()),
      onToggleSize: () => dispatch(actions.lookupSizeToggled()),
      onPointerInsideChange: (isInside) =>
        dispatch(actions.lookupPointerInsideChanged(isInside)),
    }),
    /**
     * The occurrence the pop-up shows, if it shows a word from the text, with the pop-up's id,
     * and the length of the text its best result matched once the lookup has answered, or null when nothing matched.
     */
    activeOccurrence: chosen?.occurrence && {
      ...chosen.occurrence,
      source: chosen.source,
      popupId,
      length: matchedLengthOf(display.state, display.results),
    },
    /** The word the pop-up shows, or the empty string while it shows none. */
    shownTerm: chosen?.word.term ?? "",
    /** The passage whose translation the pop-up's sentence row shows, or null while it shows none; null for the current sentence or cue. */
    translatedSource:
      lookup?.popup && row.translation?.isShown
        ? (chosen?.source ?? null)
        : undefined,
    wordOf,
    clickWord: (word: ChosenWord, input: WordHit["input"]) =>
      dispatch(actions.lookupWordClicked(word, input)),
    /** Opens the pop-up at a held word, or keeps it there, with its sentence's translation shown when there is one to show. */
    holdWord: (word: ChosenWord) =>
      dispatch(actions.lookupWordHeld(word, hasTranslationOf(word.source))),
    /** The T key: shows or hides the translation of the current sentence or cue in the pop-up's sentence row, as `sentenceTranslationActionOf` decides. */
    toggleSentenceTranslation: () => {
      const latest = selectLookup(store.getState().app);
      const action =
        latest && sentenceTranslationActionOf(latest, hasTranslationOf);
      if (action) dispatch(action);
    },
    startFlashcardFor: made.startFlashcardFor,
    /** Starts a flashcard for the word at the lookup cursor, or, when there is none, for no word from `wordlessPlace`. */
    startFlashcardAtCursor: (
      destination: FlashcardDestination,
      wordlessPlace: LookupPlace | null,
    ) =>
      made.startFlashcardAtCursor(
        selectLookup(store.getState().app)?.cursor?.chosen ?? null,
        destination,
        wordlessPlace,
      ),
    startWordlessFlashcard: made.startWordlessFlashcard,
    openSearch: () => dispatch(actions.lookupSearchOpened()),
    close: () => dispatch(actions.lookupClosed()),
    /** Closes the pop-up for something else that keeps playback paused, such as the dictionaries settings. */
    setAsideFor: (next: () => void) => {
      dispatch(actions.lookupSetAside());
      next();
    },
  };
}

/** The sentence row for the passage of the word the pop-up shows, or for the current sentence or cue while it shows none. */
function sentenceRowOf(
  sentence: SentenceRowSource,
  source: LookupSource | null,
  isTranslationShown: boolean,
  onToggle: () => void,
): SentenceRowProps {
  const facts = sentence.factsOf(source);
  return {
    play: facts.hasAudio
      ? { label: sentence.playLabel, onPlay: () => sentence.play(source) }
      : undefined,
    translation:
      facts.translation === null
        ? undefined
        : {
            text: facts.translation,
            language: sentence.translationLanguage,
            isShown: isTranslationShown,
            onToggle,
          },
  };
}
