import type { Cue } from "@easyimmerse/types";
import type { LookupText } from "./lookupTextAt.ts";

/** One word to look up: the word as shown, the text sent to the dictionaries, and the cue a flashcard made from it takes its sentence from. */
export type LookupRequest = {
  term: string;
  lookup: Pick<LookupText, "text"> & Partial<LookupText>;
  cue: Cue | null;
};

/** The dictionary pop-up: closed, or open on a word or on its search field. */
export type LookupPopup = {
  mode: "hover" | "search";
  request: LookupRequest | null;
} | null;

export type LookupPopupAction =
  | { type: "wordChosen"; request: LookupRequest }
  | { type: "searchOpened" }
  | { type: "termSearched"; term: string }
  | { type: "closed" };

/** Opens, changes and closes the dictionary pop-up. */
export function reduceLookupPopup(
  popup: LookupPopup,
  action: LookupPopupAction,
): LookupPopup {
  switch (action.type) {
    case "wordChosen":
      return { mode: "hover", request: action.request };
    case "searchOpened":
      return { mode: "search", request: null };
    case "termSearched":
      return searchTerm(popup, action.term.trim());
    case "closed":
      return null;
  }
}

/** Looks up a typed or clicked term in the open pop-up, keeping the cue its first word came from. */
function searchTerm(popup: LookupPopup, term: string): LookupPopup {
  if (term === "") return popup;
  return {
    mode: popup?.mode ?? "search",
    request: {
      term,
      lookup: { text: term },
      cue: popup?.request?.cue ?? null,
    },
  };
}
