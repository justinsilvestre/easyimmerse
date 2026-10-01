import type { WordHover } from "@easyimmerse/state";
import type { MediaFile } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { PickedEntry } from "../components/DictionaryPopupBody.tsx";
import { fixtureTranslationCues } from "../storybook/fixtureTranslationCues.ts";
import {
  fixtureBilingualEntry,
  fixtureLookupResults,
  fixtureMonolingualDictionary,
  fixtureMonolingualEntry,
} from "../testSupport/fixtureLookup.ts";
import { fixtureProject } from "../testSupport/fixtureProject.ts";
import {
  findStructuredEntry,
  fixtureStructuredDictionary,
} from "../testSupport/fixtureStructuredLookup.ts";
import {
  buildFlashcardDraftRequest,
  type DraftMedia,
} from "./buildFlashcardDraftRequest.ts";

const video = fixtureProject.media[0] as MediaFile;

const hover: WordHover = {
  word: "Katzen",
  context: "Die Katzen schlafen.",
  clip: { start_ms: 500, end_ms: 1500 },
};

const media = (file: MediaFile = video): DraftMedia => ({
  file,
  translationCues: fixtureTranslationCues,
});

const pickedMonolingualEntry: PickedEntry = {
  dictionary: fixtureMonolingualDictionary,
  entry: fixtureMonolingualEntry,
};

const pickStructuredEntry = (term: string): PickedEntry => ({
  dictionary: fixtureStructuredDictionary,
  entry: findStructuredEntry(term),
});

function build(picked: PickedEntry | null = null, draftMedia = media()) {
  return buildFlashcardDraftRequest(
    hover,
    { picked, results: fixtureLookupResults },
    draftMedia,
    fixtureProject.settings,
  );
}

describe("buildFlashcardDraftRequest", () => {
  it("keeps the word as it appeared", () => {
    expect(build().word).toBe("Katzen");
  });

  it("takes the lemma from the first entry", () => {
    expect(build().lemma).toBe("Katze");
  });

  it("takes the first reading any entry has", () => {
    expect(build(pickedMonolingualEntry).reading).toBeNull();
  });

  describe("when no entry was picked", () => {
    it("fills the L1 definitions from dictionaries in the translation language", () => {
      expect(build().l1_definitions).toEqual(fixtureBilingualEntry.definitions);
    });

    it("fills the L2 definitions from dictionaries in the target language", () => {
      expect(build().l2_definitions).toEqual(
        fixtureMonolingualEntry.definitions,
      );
    });
  });

  describe("when an entry was picked", () => {
    it("leaves out the L1 definitions of other dictionaries", () => {
      expect(build(pickedMonolingualEntry).l1_definitions).toEqual([]);
    });

    it("fills the L2 definitions from the picked entry", () => {
      expect(build(pickedMonolingualEntry).l2_definitions).toEqual(
        fixtureMonolingualEntry.definitions,
      );
    });
  });

  describe("when the picked entry has structured definitions", () => {
    it("writes each definition as plain text", () => {
      expect(build(pickStructuredEntry("猫")).l1_definitions).toEqual([
        "n\ncat",
      ]);
    });

    it("leaves out definitions that have no text", () => {
      expect(build(pickStructuredEntry("犬")).l1_definitions).toEqual([
        "dog",
        "hound",
      ]);
    });
  });

  it("treats an entry from a dictionary without declared languages as L1", () => {
    const request = buildFlashcardDraftRequest(
      hover,
      {
        picked: null,
        results: [
          {
            dictionary: {
              id: "d3",
              title: "Undeclared",
              entry_count: 1,
              source_language: null,
              target_language: null,
            },
            entries: [fixtureBilingualEntry],
          },
        ],
      },
      media(),
      fixtureProject.settings,
    );
    expect(request.l1_definitions).toEqual(fixtureBilingualEntry.definitions);
  });

  it("takes the context translation from the overlapping translation cue", () => {
    expect(build().context_translation).toBe("Die Katze schläft.");
  });

  it("names the media the word came from", () => {
    expect(build().media_name).toBe(video.name);
  });

  it("takes the screenshot at the middle of the clip for a video", () => {
    expect(build().screenshot_ms).toBe(1000);
  });

  it("takes no screenshot for audio", () => {
    expect(
      build(null, media({ ...video, kind: "audio" })).screenshot_ms,
    ).toBeNull();
  });

  it("passes on the project's flashcard settings", () => {
    expect(build().settings).toEqual(
      fixtureProject.settings.flashcard_settings,
    );
  });
});
