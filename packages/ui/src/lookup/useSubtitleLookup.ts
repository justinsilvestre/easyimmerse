import type { ChosenWord } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import {
  type ComponentProps,
  type RefObject,
  useMemo,
  useReducer,
} from "react";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { WordHit } from "../components/useWordGestures.ts";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut.ts";
import { useNavigate } from "../hooks/useNavigate.ts";
import { useStableCallbacks } from "../hooks/useStableCallbacks.ts";
import { type CueCursor, reduceCueCursor } from "../media/cueCursor.ts";
import type {
  ActiveCueWord,
  CueWordGestures,
} from "../media/cueWordGestures.ts";
import type { DictionaryPopup } from "./DictionaryPopup.tsx";
import { lookupTextAt } from "./lookupTextAt.ts";
import { useCachedMatchLength } from "./useCachedMatchLength.ts";
import type { LookupFlashcardStarts } from "./useLookupFlashcardHandoff.ts";
import { useWordLookup } from "./useWordLookup.ts";

/**
 * Looks up words of the subtitles in the dictionary pop-up, which pauses playback while it is open
 * and resumes it when closed, unless the lookup led on to a flashcard or to the dictionaries settings.
 * Keeps the one lookup cursor of the subtitles, which the mouse and the keyboard move alike, wherever the subtitles are shown.
 * While the screen that `screenRef` marks is in reach, the L key looks up from the cursor as a click there would,
 * or opens the pop-up's search field when there is no cursor,
 * and the C key saves a flashcard from the cursor as a double-click there would, or for no word when there is no cursor.
 * Returns the gestures for the subtitles' words, which keep their identity across renders,
 * the word the pop-up shows, which keeps its identity while it shows the same word and is highlighted only while there is no cursor,
 * the cursor's place, highlighted at once when its word's lookup is cached,
 * and the pop-up's props, or null while it is closed.
 */
export function useSubtitleLookup(
  languages: { target: string; translation: string },
  starts: LookupFlashcardStarts,
  screenRef: RefObject<Element | null>,
) {
  const navigate = useNavigate();
  const lookup = useWordLookup(languages, starts);
  const chosenAt = (hit: WordHit, cue: Cue): ChosenWord => ({
    word: lookup.wordOf(
      hit.word,
      lookupTextAt(stripMarkup(cue.text), hit.start),
    ),
    source: { kind: "cue", cue },
    occurrence: { passage: String(cue.index), start: hit.start },
    anchor: { elementId: hit.element.id },
  });
  const [cursor, dispatchCursor] = useReducer(reduceCueCursor, null);
  const cursorMatch = useCachedMatchLength(
    cursor ? chosenAt(cursor.hit, cursor.cue).word.query : undefined,
  );
  const position = useShownCursor(cursor, cursorMatch);
  const lookUpCursor = () => {
    if (cursor?.hit.element.isConnected)
      lookup.clickWord(chosenAt(cursor.hit, cursor.cue), "keyboard");
    else lookup.openSearch();
  };
  useKeyboardShortcut("l", lookUpCursor, screenRef);
  const startFlashcardAtCursor = (destination: "save" | "editor") => {
    if (cursor?.hit.element.isConnected)
      lookup.startFlashcardFor(chosenAt(cursor.hit, cursor.cue), destination);
    else starts[destination]("", null, null);
  };
  useKeyboardShortcut("c", () => startFlashcardAtCursor("save"), screenRef);
  const popup = lookup.popup && {
    anchored: lookup.popup.anchored,
    props: {
      ...lookup.popup.props,
      onSetUpDictionary: () =>
        lookup.setAsideFor(() => navigate({ type: "openDictionaries" })),
    } satisfies ComponentProps<typeof DictionaryPopup>,
  };
  const wordGestures = useStableCallbacks<Required<CueWordGestures>>({
    onWordClick: (hit, cue) => lookup.clickWord(chosenAt(hit, cue), hit.input),
    onWordPointed: (hit, input, cue) =>
      dispatchCursor(
        hit
          ? {
              type: "pointed",
              cue,
              hit,
              shownMatchedLength: position?.matchedLength,
            }
          : { type: "left", input },
      ),
    onWordHover: (hit, cue) => lookup.hoverWord(chosenAt(hit, cue)),
    onWordHoverAnswered: (hit, matchedLength, cue) => {
      dispatchCursor({ type: "answered", cue, hit, matchedLength });
      lookup.restOnWord(chosenAt(hit, cue));
    },
    onWordDoubleClick: (hit, cue) =>
      lookup.startFlashcardFor(chosenAt(hit, cue)),
    onWordHold: (hit, cue) => lookup.startFlashcardFor(chosenAt(hit, cue)),
  });
  return {
    activeWord: useActiveCueWord(lookup.activeOccurrence, cursor === null),
    cursor: position,
    popup,
    openSearch: lookup.openSearch,
    /**
     * Starts a flashcard for the word at the cursor once its lookup answers, as a double-click there would,
     * or, when there is no cursor, for no word; saved at once, or opened in the editor, as `destination` says.
     */
    startFlashcardAtCursor,
    wordGestures,
  };
}

/** The cursor's place, with the length its word's cached lookup matched until the cursor's own lookup has answered. */
function useShownCursor(
  cursor: CueCursor | null,
  cachedMatch: number | null | undefined,
) {
  const position = cursor?.position ?? null;
  return useMemo(
    () =>
      position === null ||
      position.matchedLength !== undefined ||
      cachedMatch === undefined
        ? position
        : { ...position, matchedLength: cachedMatch },
    [position, cachedMatch],
  );
}

/**
 * The word of a cue the pop-up shows, as one object for as long as it shows the same word with the same match
 * and its highlight stays on or off.
 */
function useActiveCueWord(
  occurrence: ReturnType<typeof useWordLookup>["activeOccurrence"],
  isHighlighted: boolean,
): ActiveCueWord | undefined {
  const cueIndex =
    occurrence?.source?.kind === "cue"
      ? occurrence.source.cue.index
      : undefined;
  const start = occurrence?.start;
  const length = occurrence?.length;
  const popupId = occurrence?.popupId;
  return useMemo(
    () =>
      cueIndex === undefined || start === undefined || popupId === undefined
        ? undefined
        : { cueIndex, start, length, popupId, isHighlighted },
    [cueIndex, start, length, popupId, isHighlighted],
  );
}
