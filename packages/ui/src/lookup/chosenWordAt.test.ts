import { describe, expect, it } from "vitest";
import { chosenWordAt } from "./chosenWordAt.ts";
import { lookupWordOf } from "./lookupWordOf.ts";

const cue = {
  index: 3,
  start_ms: 0,
  end_ms: 1000,
  text: "Die <i>Katze</i> frisst.",
};
const element = document.createElement("span");
element.id = "cue-3-4";
const hit = { word: "Katze", start: 4, element, input: "mouse" as const };
const wordOf = (term: string, text: { text: string }) =>
  lookupWordOf(term, text, "de", true);

describe("chosenWordAt", () => {
  it("looks the word up from its place in the cue's text without markup", () => {
    expect(chosenWordAt(hit, cue, wordOf).word.query).toEqual({
      text: "Katze frisst.",
      language: "de",
      context: "Die Katze frisst.",
      offset: 4,
    });
  });

  it("names the occurrence by the cue's index and the word's offset", () => {
    expect(chosenWordAt(hit, cue, wordOf).occurrence).toEqual({
      passage: "3",
      start: 4,
    });
  });

  it("anchors the pop-up at the word's element", () => {
    expect(chosenWordAt(hit, cue, wordOf).anchor).toEqual({
      elementId: "cue-3-4",
    });
  });

  it("takes the cue as the word's passage", () => {
    expect(chosenWordAt(hit, cue, wordOf).source).toEqual({ kind: "cue", cue });
  });
});
