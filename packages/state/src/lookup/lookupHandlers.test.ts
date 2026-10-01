import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import type { AppState } from "../appState.ts";
import { initialAppState } from "../appState.ts";
import { interiorSeekTime } from "../player/interiorSeekTime.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { createEditingFlashcardEditor } from "../testSupport/createEditingFlashcardEditor.ts";
import { createNewFlashcard } from "../testSupport/createNewFlashcard.ts";
import { update } from "../update.ts";
import type { LookupState } from "./lookupState.ts";

const clip = { start_ms: 1000, end_ms: 2500 };
const editorClip = { start_ms: 4000, end_ms: 5000 };

const hover = (withClip: boolean) =>
  actions.wordHovered({
    word: "Katze",
    context: "Die Katze schläft.",
    clip: withClip ? clip : null,
  });

const playing = () => createAppState({ playing: true });

const withLookup = (
  resumePlaybackOnClose: boolean,
  changes: Partial<AppState> = {},
) => {
  const lookup: LookupState = {
    kind: "open",
    term: "Katze",
    context: null,
    clip,
    typed: false,
    preferredReading: null,
    resumePlaybackOnClose,
  };
  return createAppState({}, { lookup, ...changes });
};

describe("update", () => {
  it("opens the lookup on the hovered word for wordHovered", () => {
    const [state] = update(initialAppState, hover(true));
    expect(state.lookup).toEqual({
      kind: "open",
      term: "Katze",
      context: "Die Katze schläft.",
      clip,
      typed: false,
      preferredReading: null,
      resumePlaybackOnClose: false,
    });
  });

  it("opens an empty typed lookup for lookupOpenedForTyping", () => {
    const [state] = update(initialAppState, actions.lookupOpenedForTyping());
    expect(state.lookup).toMatchObject({ kind: "open", term: "", typed: true });
  });

  describe("when media is paused", () => {
    it("returns no effects for wordHovered", () => {
      const [, effects] = update(initialAppState, hover(true));
      expect(effects).toEqual([]);
    });
  });

  describe("when media is playing", () => {
    it("loops the clip for wordHovered with a clip", () => {
      const [, effects] = update(playing(), hover(true));
      expect(effects).toEqual([
        {
          type: "setPlayerLoop",
          loop: {
            range: clip,
            restartMs: interiorSeekTime(clip.start_ms, undefined),
          },
        },
      ]);
    });

    it("records the loop in the player state for wordHovered with a clip", () => {
      const [state] = update(playing(), hover(true));
      expect(state.player.loop).toEqual(clip);
    });

    it("pauses for wordHovered without a clip", () => {
      const [, effects] = update(playing(), hover(false));
      expect(effects).toEqual([{ type: "pausePlayer" }]);
    });

    it("pauses for lookupOpenedForTyping", () => {
      const [, effects] = update(playing(), actions.lookupOpenedForTyping());
      expect(effects).toEqual([{ type: "pausePlayer" }]);
    });

    it("remembers to resume playback for wordHovered", () => {
      const [state] = update(playing(), hover(false));
      expect(state.lookup).toMatchObject({ resumePlaybackOnClose: true });
    });
  });

  describe("when an open lookup paused playback", () => {
    it("still resumes playback after another word is hovered", () => {
      const [state] = update(withLookup(true), hover(false));
      expect(state.lookup).toMatchObject({ resumePlaybackOnClose: true });
    });
  });

  describe("when a lookup is open", () => {
    it("changes the term for lookupTermTyped", () => {
      const [state] = update(
        withLookup(false),
        actions.lookupTermTyped("Hund"),
      );
      expect(state.lookup).toMatchObject({ term: "Hund" });
    });

    it("forgets the preferred reading for lookupTermTyped", () => {
      const [followed] = update(
        withLookup(false),
        actions.lookupReferenceFollowed({ term: "犬", reading: "いぬ" }),
      );
      const [state] = update(followed, actions.lookupTermTyped("Hund"));
      expect(state.lookup).toMatchObject({ preferredReading: null });
    });

    it("changes the term for lookupReferenceFollowed", () => {
      const [state] = update(
        withLookup(false),
        actions.lookupReferenceFollowed({ term: "犬", reading: null }),
      );
      expect(state.lookup).toMatchObject({ term: "犬" });
    });

    it("prefers the referenced reading for lookupReferenceFollowed", () => {
      const [state] = update(
        withLookup(false),
        actions.lookupReferenceFollowed({ term: "犬", reading: "いぬ" }),
      );
      expect(state.lookup).toMatchObject({ preferredReading: "いぬ" });
    });

    it("closes the lookup for lookupClosed", () => {
      const [state] = update(withLookup(false), actions.lookupClosed());
      expect(state.lookup).toEqual({ kind: "closed" });
    });

    it("clears the loop without resuming for lookupClosed when playback was not interrupted", () => {
      const [, effects] = update(withLookup(false), actions.lookupClosed());
      expect(effects).toEqual([{ type: "setPlayerLoop", loop: null }]);
    });

    it("clears the loop and resumes for lookupClosed when playback was interrupted", () => {
      const [, effects] = update(withLookup(true), actions.lookupClosed());
      expect(effects).toEqual([
        { type: "setPlayerLoop", loop: null },
        { type: "playPlayer" },
      ]);
    });
  });

  describe("when a lookup is open over the flashcard editor", () => {
    const overEditor = (resumePlaybackOnClose: boolean) =>
      withLookup(resumePlaybackOnClose, {
        flashcardEditor: createEditingFlashcardEditor(
          createNewFlashcard({ clip: editorClip }),
        ),
      });

    it("restores the editor's loop without resuming for lookupClosed", () => {
      const [, effects] = update(overEditor(true), actions.lookupClosed());
      expect(effects).toEqual([
        {
          type: "setPlayerLoop",
          loop: {
            range: editorClip,
            restartMs: interiorSeekTime(editorClip.start_ms, undefined),
          },
        },
      ]);
    });

    it("leaves resuming playback to the editor for lookupClosed when playback was interrupted", () => {
      const [state] = update(overEditor(true), actions.lookupClosed());
      expect(state.flashcardEditor).toMatchObject({
        resumePlaybackOnClose: true,
      });
    });

    it("does not make the editor resume playback for lookupClosed when playback was not interrupted", () => {
      const [state] = update(overEditor(false), actions.lookupClosed());
      expect(state.flashcardEditor).toMatchObject({
        resumePlaybackOnClose: false,
      });
    });
  });

  describe("when no lookup is open", () => {
    it("leaves state unchanged for lookupTermTyped", () => {
      const [state] = update(initialAppState, actions.lookupTermTyped("Hund"));
      expect(state).toBe(initialAppState);
    });

    it("leaves state unchanged for lookupReferenceFollowed", () => {
      const [state] = update(
        initialAppState,
        actions.lookupReferenceFollowed({ term: "犬", reading: null }),
      );
      expect(state).toBe(initialAppState);
    });

    it("returns no effects for lookupClosed", () => {
      const [, effects] = update(initialAppState, actions.lookupClosed());
      expect(effects).toEqual([]);
    });
  });
});
