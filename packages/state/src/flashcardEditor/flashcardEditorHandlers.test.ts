import type { NewFlashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { actions } from "../actions.ts";
import type { AppState } from "../appState.ts";
import { initialAppState } from "../appState.ts";
import { interiorSeekTime } from "../player/interiorSeekTime.ts";
import { createAppState } from "../testSupport/createAppState.ts";
import { createEditingFlashcardEditor } from "../testSupport/createEditingFlashcardEditor.ts";
import { createNewFlashcard } from "../testSupport/createNewFlashcard.ts";
import { update } from "../update.ts";

const clip = { start_ms: 1000, end_ms: 2500 };

const editing = (
  card: NewFlashcard = createNewFlashcard(),
  resumePlaybackOnClose = false,
) =>
  createAppState(
    {},
    {
      flashcardEditor: createEditingFlashcardEditor(card, {
        resumePlaybackOnClose,
      }),
    },
  );

const editedCard = (state: AppState) =>
  state.flashcardEditor.kind === "editing" ? state.flashcardEditor.card : null;

const withScreenshot = () =>
  createNewFlashcard({
    fields: [
      { kind: "word", value: "Katze" },
      { kind: "screenshot", value: "" },
    ],
  });

describe("update", () => {
  describe("for flashcardEditorOpened", () => {
    const open = (state: AppState, card = createNewFlashcard()) =>
      update(state, actions.flashcardEditorOpened("p1", card, null));

    const withPausingLookup = () =>
      createAppState(
        {},
        {
          lookup: {
            kind: "open",
            term: "Katze",
            context: null,
            clip: null,
            typed: false,
            resumePlaybackOnClose: true,
          },
        },
      );

    it("opens the editor on the card", () => {
      const card = createNewFlashcard();
      const [state] = update(
        initialAppState,
        actions.flashcardEditorOpened("p1", card, "f1"),
      );
      expect(state.flashcardEditor).toEqual({
        kind: "editing",
        projectId: "p1",
        flashcardId: "f1",
        card,
        resumePlaybackOnClose: false,
      });
    });

    it("closes the lookup", () => {
      const [state] = open(withPausingLookup());
      expect(state.lookup).toEqual({ kind: "closed" });
    });

    it("loops the card's clip", () => {
      const [, effects] = open(initialAppState, createNewFlashcard({ clip }));
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

    it("pauses when the card has no clip", () => {
      const [, effects] = open(initialAppState);
      expect(effects).toEqual([{ type: "pausePlayer" }]);
    });

    it("remembers to resume playback when media was playing", () => {
      const [state] = open(createAppState({ playing: true }));
      expect(state.flashcardEditor).toMatchObject({
        resumePlaybackOnClose: true,
      });
    });

    it("takes over resuming playback from a lookup that paused it", () => {
      const [state] = open(withPausingLookup());
      expect(state.flashcardEditor).toMatchObject({
        resumePlaybackOnClose: true,
      });
    });
  });

  describe("when the editor is open", () => {
    it("changes the matching field's value for flashcardFieldEdited", () => {
      const [state] = update(
        editing(),
        actions.flashcardFieldEdited("word", "Hund"),
      );
      expect(editedCard(state)?.fields).toEqual([
        { kind: "word", value: "Hund" },
        { kind: "context", value: "Die Katze schläft." },
      ]);
    });

    it("adds a missing field in canonical order for flashcardFieldToggled", () => {
      const [state] = update(
        editing(),
        actions.flashcardFieldToggled("l2_definition"),
      );
      expect(editedCard(state)?.fields.map((field) => field.kind)).toEqual([
        "word",
        "l2_definition",
        "context",
      ]);
    });

    it("removes a present field for flashcardFieldToggled", () => {
      const [state] = update(editing(), actions.flashcardFieldToggled("word"));
      expect(editedCard(state)?.fields.map((field) => field.kind)).toEqual([
        "context",
      ]);
    });

    it("replaces the tags for flashcardTagsEdited", () => {
      const [state] = update(
        editing(),
        actions.flashcardTagsEdited(["anime", "n5"]),
      );
      expect(editedCard(state)?.tags).toEqual(["anime", "n5"]);
    });

    it("returns a captureFrame effect for frameCaptureRequested", () => {
      const [, effects] = update(editing(), actions.frameCaptureRequested());
      expect(effects).toEqual([{ type: "captureFrame" }]);
    });

    it("fills the screenshot field for frameCaptured", () => {
      const [state] = update(
        editing(withScreenshot()),
        actions.frameCaptured("data:image/png;base64,AA"),
      );
      expect(editedCard(state)?.fields[1]).toEqual({
        kind: "screenshot",
        value: "data:image/png;base64,AA",
      });
    });

    it("leaves the fields unchanged for frameCaptured when the card has no screenshot field", () => {
      const [state] = update(
        editing(),
        actions.frameCaptured("data:image/png;base64,AA"),
      );
      expect(editedCard(state)?.fields).toEqual(createNewFlashcard().fields);
    });

    it("leaves state unchanged when frameCaptured carries null", () => {
      const before = editing(withScreenshot());
      const [state] = update(before, actions.frameCaptured(null));
      expect(state).toBe(before);
    });

    it("closes the editor for flashcardEditorClosed", () => {
      const [state] = update(editing(), actions.flashcardEditorClosed());
      expect(state.flashcardEditor).toEqual({ kind: "closed" });
    });

    it("clears the loop without resuming for flashcardEditorClosed when playback was not interrupted", () => {
      const [, effects] = update(editing(), actions.flashcardEditorClosed());
      expect(effects).toEqual([{ type: "setPlayerLoop", loop: null }]);
    });

    it("clears the loop and resumes for flashcardEditorClosed when playback was interrupted", () => {
      const [, effects] = update(
        editing(createNewFlashcard(), true),
        actions.flashcardEditorClosed(),
      );
      expect(effects).toEqual([
        { type: "setPlayerLoop", loop: null },
        { type: "playPlayer" },
      ]);
    });
  });

  describe("when the editor is closed", () => {
    it("leaves state unchanged for flashcardFieldEdited", () => {
      const [state] = update(
        initialAppState,
        actions.flashcardFieldEdited("word", "Hund"),
      );
      expect(state).toBe(initialAppState);
    });

    it("returns no effects for flashcardEditorClosed", () => {
      const [, effects] = update(
        initialAppState,
        actions.flashcardEditorClosed(),
      );
      expect(effects).toEqual([]);
    });
  });
});
