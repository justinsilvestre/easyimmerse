import { describe, expect, it } from "vitest";
import {
  findFlashcardField,
  labelOfFieldGroup,
  toggleField,
} from "./flashcardFields.ts";

const languages = { target: "de", translation: "en" };

describe("findFlashcardField", () => {
  it("labels a definition with the code of its language", () => {
    expect(findFlashcardField("l1Definition").label(languages)).toBe(
      "Definition (en)",
    );
  });

  it("labels the sentence with the code of the target language", () => {
    expect(findFlashcardField("textContext").label(languages)).toBe(
      "Sentence (de)",
    );
  });
});

describe("labelOfFieldGroup", () => {
  it("names a language group after its language", () => {
    expect(labelOfFieldGroup("translation", languages)).toBe("English");
  });

  it("names the media group", () => {
    expect(labelOfFieldGroup("media", languages)).toBe("Media and tags");
  });
});

describe("toggleField", () => {
  it("adds a field that is not selected", () => {
    expect(toggleField(["word"], "tags")).toEqual(["word", "tags"]);
  });

  it("removes a field that is selected", () => {
    expect(toggleField(["word", "tags"], "tags")).toEqual(["word"]);
  });
});
