import { describe, expect, it } from "vitest";
import { fixtureDictionaries } from "../../testSupport/fixtureResponses.ts";
import { dictionaryStatusesOf } from "./dictionaryStatusesOf.ts";

const { dictionaries } = fixtureDictionaries;

describe("dictionaryStatusesOf", () => {
  it("counts the enabled dictionaries of the target language", () => {
    const [target] = dictionaryStatusesOf(dictionaries, {
      target_language: "de",
      translation_language: "en",
    });
    expect(target?.dictionaryCount).toBe(2);
  });

  it("counts those among them with definitions in the translation language", () => {
    const [, translation] = dictionaryStatusesOf(dictionaries, {
      target_language: "de",
      translation_language: "en",
    });
    expect(translation?.dictionaryCount).toBe(1);
  });

  it("leaves out disabled dictionaries", () => {
    const [target] = dictionaryStatusesOf(dictionaries, {
      target_language: "ja",
      translation_language: "en",
    });
    expect(target?.dictionaryCount).toBe(0);
  });
});
