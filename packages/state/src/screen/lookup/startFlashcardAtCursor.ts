import type { AppState } from "../../app/appState.ts";
import type { PlayerState } from "../mediaScreen/playerState.ts";
import type { LookupStep } from "./lookupMoves.ts";
import type {
  ChosenWord,
  LookupState,
  LookupWord,
  PendingFlashcard,
} from "./lookupState.ts";
import { startFlashcard, startWordlessFlashcard } from "./startFlashcard.ts";

/** Starts a flashcard for the word at the cursor, or for no word when there is no cursor. */
export function startFlashcardAtCursor(
  lookup: LookupState,
  destination: PendingFlashcard["destination"],
  player: PlayerState,
  app: AppState,
): LookupStep {
  const chosen = lookup.cursor?.chosen;
  return chosen
    ? startFlashcard(lookup, { chosen, destination }, player, app)
    : startWordlessFlashcard(lookup, destination, app);
}

/** Starts a flashcard for a word held inside the pop-up, with the passage and place of the word the pop-up shows. */
export function startPopupWordFlashcard(
  lookup: LookupState,
  term: string,
  player: PlayerState,
  app: AppState,
): LookupStep {
  const shown = lookup.popup?.chosen;
  if (!shown) return [lookup, []];
  const chosen: ChosenWord = {
    word: wordInPopup(term, shown.word),
    source: shown.source,
    occurrence: null,
    anchor: shown.anchor,
  };
  return startFlashcard(lookup, { chosen, destination: "save" }, player, app);
}

/** A word of the pop-up looked up in the language of the word the pop-up shows, or not at all when that one is not. */
function wordInPopup(term: string, shown: LookupWord): LookupWord {
  const query = shown.query && { text: term, language: shown.query.language };
  return { term, query };
}
