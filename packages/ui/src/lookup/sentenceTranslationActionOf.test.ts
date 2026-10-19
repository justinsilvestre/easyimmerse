import {
  actions,
  type ChosenWord,
  initialLookup,
  type LookupState,
} from "@easyimmerse/state";
import { describe, expect, it } from "vitest";
import { sentenceTranslationActionOf } from "./sentenceTranslationActionOf.ts";

const cue = { index: 1, start_ms: 0, end_ms: 1000, text: "The cat sleeps." };

function wordAt(start: number): ChosenWord {
  return {
    word: { term: "cat", query: null },
    source: { kind: "cue", cue },
    occurrence: { passage: "1", start },
    anchor: null,
  };
}

const cat = wordAt(4);
const sleeps = wordAt(8);
const always = () => true;
const never = () => false;

function lookupWith(parts: Partial<LookupState>): LookupState {
  return { ...initialLookup, ...parts };
}

const showing = (chosen: ChosenWord | null) =>
  lookupWith({
    popup: chosen ? { mode: "word", chosen } : { mode: "search", chosen: null },
  });

const cursorOn = (chosen: ChosenWord) => ({
  chosen,
  input: "mouse" as const,
  pointed: chosen,
});

describe("sentenceTranslationActionOf", () => {
  it("toggles the translation while the pop-up shows the cursor's word", () => {
    const lookup = lookupWith({ ...showing(cat), cursor: cursorOn(cat) });
    expect(sentenceTranslationActionOf(lookup, always)).toEqual(
      actions.lookupSentenceTranslationToggled(),
    );
  });

  it("toggles the translation while the pop-up is open and there is no cursor", () => {
    expect(sentenceTranslationActionOf(showing(cat), always)).toEqual(
      actions.lookupSentenceTranslationToggled(),
    );
  });

  it("does nothing while the shown word's sentence has no translation to show", () => {
    expect(sentenceTranslationActionOf(showing(cat), never)).toBeNull();
  });

  it("opens the pop-up at the cursor's word with the translation shown", () => {
    const lookup = lookupWith({ cursor: cursorOn(cat) });
    expect(sentenceTranslationActionOf(lookup, always)).toEqual(
      actions.lookupWordHeld(cat, true),
    );
  });

  it("moves the pop-up to the cursor's word when it shows another", () => {
    const lookup = lookupWith({ ...showing(sleeps), cursor: cursorOn(cat) });
    expect(sentenceTranslationActionOf(lookup, always)).toEqual(
      actions.lookupWordHeld(cat, true),
    );
  });

  it("does nothing for a cursor's word whose sentence has no translation to show", () => {
    const lookup = lookupWith({ cursor: cursorOn(cat) });
    expect(sentenceTranslationActionOf(lookup, never)).toBeNull();
  });

  it("opens the pop-up on its search field with the current sentence's translation when there is no cursor", () => {
    expect(sentenceTranslationActionOf(initialLookup, always)).toEqual(
      actions.lookupSentenceTranslationOpened(),
    );
  });

  it("does nothing without a cursor when the current sentence has no translation to show", () => {
    expect(sentenceTranslationActionOf(initialLookup, never)).toBeNull();
  });
});
