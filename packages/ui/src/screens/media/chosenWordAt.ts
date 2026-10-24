import {
  type ChosenWord,
  type LookupWord,
  stripMarkup,
} from "@easyimmerse/state";
import type { Cue } from "@easyimmerse/types";
import {
  type LookupText,
  lookupTextAt,
} from "../../components/wordLookup/lookupTextAt.ts";
import type { TextSelection } from "../../components/wordLookup/textSelection.ts";
import type { WordHit } from "../../components/wordLookup/useWordGestures.ts";

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

/** Text selected in a subtitle cue, as the pop-up takes it, which looks up exactly that text and stands beside it. */
export function chosenTextAt(
  selection: TextSelection,
  cue: Cue,
  wordOf: (term: string, text: Pick<LookupText, "text">) => LookupWord,
): ChosenWord {
  return {
    word: wordOf(selection.text, { text: selection.text }),
    source: { kind: "cue", cue },
    occurrence: { passage: String(cue.index), start: selection.start },
    anchor: selection.rect && { rect: selection.rect },
  };
}
