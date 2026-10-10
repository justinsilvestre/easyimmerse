import type { ChosenWord, LookupWord } from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import { stripMarkup } from "../components/ClickableText.tsx";
import type { WordHit } from "../components/useWordGestures.ts";
import { type LookupText, lookupTextAt } from "./lookupTextAt.ts";

/** The word of a subtitle cue that a hit lands on, as the pop-up and a flashcard take it; `wordOf` builds what it looks up. */
export function chosenWordAt(
  hit: WordHit,
  cue: Cue,
  wordOf: (term: string, text: LookupText) => LookupWord,
): ChosenWord {
  return {
    word: wordOf(hit.word, lookupTextAt(stripMarkup(cue.text), hit.start)),
    source: { kind: "cue", cue },
    occurrence: { passage: String(cue.index), start: hit.start },
    anchor: { elementId: hit.element.id },
  };
}
