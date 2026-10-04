import type {
  DictionarySummary,
  LookupEntry,
  ProjectSettings,
} from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { FlashcardContext, FlashcardSource } from "./buildNewFlashcard.ts";
import { buildNewFlashcard, mediaNameTag } from "./buildNewFlashcard.ts";

const settings: ProjectSettings = {
  target_language: "de",
  translation_language: "en",
  flashcard_fields: ["word", "l1_definition"],
  default_tags: ["german"],
  tags_media_name: true,
  fills_audio_with_tts: false,
};

const dictionary = (id: string, target: string): DictionarySummary => ({
  id,
  title: id,
  entry_count: 1,
  format: "yomitan",
  source_language: "de",
  target_language: target,
  is_enabled: true,
});

const entry = (
  dictionaryId: string,
  term: string,
  definitions: string[],
): LookupEntry => ({
  dictionary_id: dictionaryId,
  dictionary_title: dictionaryId,
  entry: { term, reading: null, definitions, tags: [] },
});

const context: FlashcardContext = {
  settings,
  dictionaries: [
    dictionary("bilingual", "en"),
    dictionary("monolingual", "de"),
  ],
  mediaName: "Dark S01E01.mkv",
};

const source: FlashcardSource = {
  word: "Hund",
  cue: {
    index: 3,
    start_ms: 5400,
    end_ms: 8200,
    text: "Der <i>Hund</i> will fressen.",
  },
  translationCue: {
    index: 3,
    start_ms: 5500,
    end_ms: 8300,
    text: "The dog wants to eat.",
  },
  entries: [
    entry("bilingual", "Hund", ["dog", "hound"]),
    entry("monolingual", "Hund", ["Haustier"]),
  ],
  entryIndex: null,
  screenshot: null,
};

describe("buildNewFlashcard", () => {
  it("fills the L1 definition from the dictionaries written in the translation language", () => {
    expect(buildNewFlashcard(source, context).l1_definition).toBe("dog; hound");
  });

  it("fills the L2 definition from the dictionaries written in the target language", () => {
    expect(buildNewFlashcard(source, context).l2_definition).toBe("Haustier");
  });

  it("uses only the chosen entry when one is chosen", () => {
    expect(
      buildNewFlashcard({ ...source, entryIndex: 1 }, context).l1_definition,
    ).toBe("");
  });

  it("takes the sentence from the cue without markup", () => {
    expect(buildNewFlashcard(source, context).text_context).toBe(
      "Der Hund will fressen.",
    );
  });

  it("takes the sentence's translation from the translation cue", () => {
    expect(buildNewFlashcard(source, context).text_context_translation).toBe(
      "The dog wants to eat.",
    );
  });

  it("clips the audio to the cue", () => {
    expect(buildNewFlashcard(source, context).audio_context).toEqual({
      start_ms: 5400,
      end_ms: 8200,
    });
  });

  it("adds the media name tag to the default tags", () => {
    expect(buildNewFlashcard(source, context).tags).toEqual([
      "german",
      "dark-s01e01",
    ]);
  });

  it("leaves out the media name tag when the project does not tag by media name", () => {
    expect(
      buildNewFlashcard(source, {
        ...context,
        settings: { ...settings, tags_media_name: false },
      }).tags,
    ).toEqual(["german"]);
  });
});

describe("mediaNameTag", () => {
  it("drops the extension and joins the words with dashes", () => {
    expect(mediaNameTag("Die Verwandlung (Hörbuch).mp3")).toBe(
      "die-verwandlung-(hörbuch)",
    );
  });
});
