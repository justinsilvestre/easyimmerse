import { describe, expect, it } from "vitest";
import { exampleAudioAlignment } from "./exampleAudioAlignment.ts";
import {
  exampleShortBook,
  exampleShortBookAlignment,
  exampleShortBookTranslation,
} from "./exampleDocuments.ts";
import { spokenSpansShown } from "./spokenSpansShown.ts";

const translation = exampleShortBookAlignment("b1", "t1").content;
const links = translation.kind === "translation" ? translation.links : [];
const audio = exampleAudioAlignment("a1").content;
const segments = audio.kind === "audio" ? audio.segments : [];
const dogSentence = segments[1]?.span ?? null;

describe("spokenSpansShown", () => {
  it("returns the spoken span where the book is shown", () => {
    expect(spokenSpansShown(dogSentence, exampleShortBook, null)).toEqual([
      dogSentence,
    ]);
  });

  it("returns the translation of the spoken span where the translation is shown", () => {
    expect(
      spokenSpansShown(dogSentence, exampleShortBookTranslation, links).map(
        (span) => span.quote,
      ),
    ).toEqual(["El perro quiere comer.", "Tiene hambre."]);
  });

  it("returns nothing while nothing is spoken", () => {
    expect(spokenSpansShown(null, exampleShortBook, null)).toEqual([]);
  });
});
