import type { LookupText } from "./lookupTextAt.ts";

/**
 * One word to look up: the word as shown, the text sent to the dictionaries,
 * and the passage it comes from, such as a subtitle cue, which a flashcard made from it takes its sentence from.
 */
export type LookupRequest<S> = {
  term: string;
  lookup: Pick<LookupText, "text"> & Partial<LookupText>;
  source: S | null;
  /** Names this occurrence of the word in the text, so that clicking it again can close the pop-up. Null for a typed or linked term. */
  occurrence: string | null;
  /** The element that shows the word, for the pop-up to stand at. Null when the pop-up opens on its search field. */
  anchor: Element | null;
};

/** The dictionary pop-up: closed, or open on a word or on its search field. */
export type LookupPopup<S> = {
  mode: "word" | "search";
  request: LookupRequest<S> | null;
} | null;

export type LookupPopupAction<S> =
  | { type: "wordChosen"; request: LookupRequest<S> }
  | { type: "searchOpened" }
  | { type: "termSearched"; term: string }
  | { type: "closed" };

/** Opens, changes and closes the dictionary pop-up. */
export function reduceLookupPopup<S>(
  popup: LookupPopup<S>,
  action: LookupPopupAction<S>,
): LookupPopup<S> {
  switch (action.type) {
    case "wordChosen":
      return { mode: "word", request: action.request };
    case "searchOpened":
      return { mode: "search", request: null };
    case "termSearched":
      return searchTerm(popup, action.term.trim());
    case "closed":
      return null;
  }
}

/** Looks up a typed or clicked term in the open pop-up, keeping the passage and place of the word it first opened on. */
function searchTerm<S>(popup: LookupPopup<S>, term: string): LookupPopup<S> {
  if (term === "") return popup;
  return {
    mode: popup?.mode ?? "search",
    request: {
      term,
      lookup: { text: term },
      source: popup?.request?.source ?? null,
      occurrence: null,
      anchor: popup?.request?.anchor ?? null,
    },
  };
}
