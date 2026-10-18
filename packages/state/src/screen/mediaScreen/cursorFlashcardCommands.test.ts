import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import type { ServerCacheSlice } from "../../server/cacheEntry.ts";
import { exampleProject } from "../../server/exampleProject.ts";
import { serverCacheWith } from "../../server/serverCacheWith.ts";
import {
  exampleVideo,
  fressen,
  withExampleCues,
  withFlashcardSources,
} from "./cueFlashcardTestSupport.ts";
import { cursorFlashcardCommands } from "./cursorFlashcardCommands.ts";

const save = actions.lookupCursorFlashcardRequested("save");
const onFressen = actions.lookupCursorMoved(fressen, "mouse");
const hungerSentence = "Der Hund will fressen.\nEr hat Hunger.";

/** Applies the action on the media screen of m1, six seconds in, after the given earlier actions, over the given cache. */
const apply = (
  action: AppAction,
  backend: ServerCacheSlice = withExampleCues,
  ...before: AppAction[]
) =>
  cursorFlashcardCommands(action, {
    ...stateAfter(
      actions.openMediaFileRequested("p1", "m1"),
      actions.playerTimeChanged(6),
      ...before,
    ),
    backend,
  });

/** The flashcard the command asks to start, or undefined when it asks for none. */
const startOf = (...args: Parameters<typeof apply>) => apply(...args)[0]?.start;

describe("cursorFlashcardCommands", () => {
  describe("with the lookup cursor on a word", () => {
    it("starts a flashcard for the word, to be filled from its lookup", () => {
      expect(startOf(save, withExampleCues, onFressen)?.lookup?.chosen).toEqual(
        fressen,
      );
    });

    it("takes the word's cue as the sentence", () => {
      expect(
        startOf(save, withExampleCues, onFressen)?.draft.content.text_context,
      ).toBe(hungerSentence);
    });

    it("takes the sentence's translation from the translation track", () => {
      expect(
        startOf(save, withExampleCues, onFressen)?.draft.content
          .text_context_translation,
      ).toBe("The dog wants to eat.\nIt is hungry.");
    });

    it("records where in the cue the word was taken from", () => {
      expect(startOf(save, withExampleCues, onFressen)?.draft.word_start).toBe(
        14,
      );
    });

    it("sorts the lookup's definitions by the project's languages", () => {
      expect(
        startOf(save, withExampleCues, onFressen)?.lookup?.context.languages,
      ).toEqual({ target: "ko", translation: "en" });
    });

    it("sends the flashcard where the key says", () => {
      const editor = actions.lookupCursorFlashcardRequested("editor");
      expect(startOf(editor, withExampleCues, onFressen)?.destination).toBe(
        "editor",
      );
    });
  });

  describe("with no lookup cursor", () => {
    it("starts a flashcard for no word, which needs no lookup", () => {
      expect(startOf(save)?.lookup).toBeNull();
    });

    it("takes the cue shown now as the sentence", () => {
      expect(startOf(save)?.draft.content.text_context).toBe(hungerSentence);
    });

    it("takes no sentence while the cache holds no cues", () => {
      expect(startOf(save, withFlashcardSources)?.draft.cue_index).toBeNull();
    });
  });

  it("leaves the screenshot out while the file is not known to show pictures", () => {
    expect(startOf(save)?.draft.content.screenshot).toBeNull();
  });

  it("asks for nothing while the file's record is not cached", () => {
    const projectOnly = serverCacheWith(
      "getProject",
      "p1",
      exampleProject("p1"),
    );
    expect(apply(save, projectOnly, onFressen)).toEqual([]);
  });

  it("asks for nothing while the project's settings are not cached", () => {
    const filesOnly = serverCacheWith("listMediaFiles", "p1", {
      media_files: [exampleVideo],
    });
    expect(apply(save, filesOnly, onFressen)).toEqual([]);
  });

  it("asks for nothing outside the media screen", () => {
    const app = { ...stateAfter(), backend: withExampleCues };
    expect(cursorFlashcardCommands(save, app)).toEqual([]);
  });

  it("does nothing for an unrelated action", () => {
    expect(apply(actions.playRequested())).toEqual([]);
  });
});
