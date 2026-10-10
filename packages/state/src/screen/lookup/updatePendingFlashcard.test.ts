import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { update } from "../../app/update.ts";
import {
  applyToLookup as apply,
  cat,
  dog,
  fieldsWritten,
  hoverSettled,
  lookupSettled,
  requestCursorFlashcard,
  requestFlashcard,
  restingOn,
} from "./lookupTestSupport.ts";

const saveCat = requestFlashcard(cat);
const uncoveredCat = { ...cat, word: { term: "cat", query: null } };

describe("updateMediaScreen", () => {
  describe("for a flashcard started from a word in the dictionary pop-up", () => {
    it("opens the pop-up on the word", () => {
      const [lookup] = apply(saveCat);
      expect(lookup.popup?.chosen).toEqual(cat);
    });

    it("looks the word up", () => {
      const [, effects] = apply(saveCat);
      expect(effects).toContainEqual({
        type: "sendRequest",
        id: "lookup/flashcard/f-cat",
        request: { kind: "lookupText", query: cat.word.query },
      });
    });

    it("waits for the lookup at most 1.5 seconds", () => {
      const [, effects] = apply(saveCat);
      expect(effects).toContainEqual({
        type: "startTimer",
        id: "lookup/flashcardWait",
        ms: 1500,
        action: actions.lookupFlashcardWaitEnded("f-cat"),
      });
    });

    it("names the word while it waits", () => {
      const [lookup] = apply(saveCat);
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("cancels the close of the pop-up on the second click of a double-click", () => {
      const click = actions.lookupWordClicked(cat, "mouse");
      const [, effects] = apply(saveCat, click, click);
      expect(effects).toContainEqual({
        type: "cancelTimer",
        id: "lookup/close",
      });
    });

    it("keeps waiting when the word's lookup settles, until its fields are written", () => {
      const [lookup] = apply(lookupSettled("f-cat", cat), saveCat);
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("hands the flashcard over once the fields of its lookup are written", () => {
      const [lookup] = apply(fieldsWritten("f-cat"), saveCat);
      expect(lookup.pendingFlashcard).toBeNull();
    });

    it("closes the pop-up once the fields of its lookup are written", () => {
      const [lookup] = apply(fieldsWritten("f-cat"), saveCat);
      expect(lookup.popup).toBeNull();
    });

    it("keeps playback paused once ready", () => {
      const [, effects] = apply(
        actions.lookupClosed(),
        actions.playerPlayingChanged(true),
        saveCat,
        actions.playerPlayingChanged(false),
        fieldsWritten("f-cat"),
      );
      expect(effects).not.toContainEqual({ type: "playPlayer" });
    });

    it("stops waiting once the fields of its lookup are written", () => {
      const [, effects] = apply(fieldsWritten("f-cat"), saveCat);
      expect(effects).toContainEqual({
        type: "cancelTimer",
        id: "lookup/flashcardWait",
      });
    });

    it("hands the flashcard over once the wait runs out", () => {
      const [lookup] = apply(
        actions.lookupFlashcardWaitEnded("f-cat"),
        saveCat,
      );
      expect(lookup.pendingFlashcard).toBeNull();
    });

    it("closes the pop-up once the wait runs out", () => {
      const [lookup] = apply(
        actions.lookupFlashcardWaitEnded("f-cat"),
        saveCat,
      );
      expect(lookup.popup).toBeNull();
    });

    it("holds no flashcard when no dictionary covers the word's language", () => {
      const [lookup] = apply(requestFlashcard(uncoveredCat));
      expect(lookup.pendingFlashcard).toBeNull();
    });

    it("sends nothing when no dictionary covers the word's language", () => {
      const [, effects] = apply(requestFlashcard(uncoveredCat));
      expect(effects.filter(({ type }) => type === "sendRequest")).toEqual([]);
    });

    it("keeps waiting when a flashcard for another word no dictionary covers is asked for", () => {
      const uncoveredDog = { ...dog, word: { term: "dog", query: null } };
      const [lookup] = apply(requestFlashcard(uncoveredDog), saveCat);
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("starts a flashcard for the cursor's word on the C key", () => {
      const [lookup] = apply(
        requestCursorFlashcard(dog),
        actions.lookupCursorMoved(dog, "mouse"),
      );
      expect(lookup.pendingFlashcard?.chosen).toEqual(dog);
    });

    it("starts a flashcard for the word the cursor showed when the C key was pressed, after the store's cursor moved", () => {
      const [lookup] = apply(
        requestCursorFlashcard(cat),
        actions.lookupCursorMoved(dog, "mouse"),
      );
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("starts a flashcard for the word the cursor showed when the C key was pressed, after the store's cursor was cleared", () => {
      const [lookup] = apply(requestCursorFlashcard(cat));
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("keeps waiting when the C key is pressed with no cursor", () => {
      const [lookup] = apply(requestCursorFlashcard(null), saveCat);
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("ignores the fields of an earlier flashcard's lookup", () => {
      const [lookup] = apply(
        fieldsWritten("f-cat"),
        saveCat,
        requestFlashcard(dog),
      );
      expect(lookup.pendingFlashcard?.chosen).toEqual(dog);
    });

    it("ignores the wait of a flashcard handed over before it", () => {
      const [lookup] = apply(
        actions.lookupFlashcardWaitEnded("f-cat"),
        saveCat,
        actions.lookupClosed(),
        requestFlashcard(dog),
      );
      expect(lookup.pendingFlashcard?.chosen).toEqual(dog);
    });

    it("hands the flashcard over when the pop-up closes", () => {
      const [lookup] = apply(actions.lookupClosed(), saveCat);
      expect(lookup.pendingFlashcard).toBeNull();
    });

    it("hands the flashcard over when another word is clicked", () => {
      const [lookup] = apply(actions.lookupWordClicked(dog, "mouse"), saveCat);
      expect(lookup.pendingFlashcard).toBeNull();
    });

    it("hands the flashcard over when a word is searched", () => {
      const [lookup] = apply(
        actions.lookupTermSearched({ term: "Hund", query: null }),
        saveCat,
      );
      expect(lookup.pendingFlashcard).toBeNull();
    });

    it("keeps the flashcard when the mouse rests on another word", () => {
      const [lookup] = apply(
        hoverSettled(1, dog, "dog"),
        saveCat,
        ...restingOn(dog),
      );
      expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
    });

    it("numbers a hover's lookup after one still in flight from an earlier opening", () => {
      const app = stateAfter(
        actions.openMediaFileRequested("p1", "m1"),
        actions.lookupWordHovered(cat),
        actions.closeMedia(),
        actions.openMediaFileRequested("p1", "m1"),
      );
      const [, effects] = update(app, actions.lookupWordHovered(dog));
      expect(effects).toContainEqual(
        expect.objectContaining({ id: "lookup/hover/2" }),
      );
    });

    it("shows a word held inside the pop-up with the word it opened on", () => {
      const katze = { term: "Katze", query: { text: "Katze", language: "de" } };
      const held = { ...cat, word: katze, occurrence: null };
      const [lookup] = apply(
        requestFlashcard(held),
        actions.lookupWordClicked(dog, "mouse"),
      );
      expect(lookup.popup?.chosen).toEqual(dog);
    });
  });
});
