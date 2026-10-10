import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import { lookupRequestId } from "./lookupIds.ts";
import {
  applyToLookup as apply,
  cat,
  dog,
  lookupSettled,
} from "./lookupTestSupport.ts";

const saveCat = actions.lookupFlashcardRequested(cat, "save");
const uncoveredCat = { ...cat, word: { term: "cat", query: null } };

describe("updateLookup for a flashcard started from a word", () => {
  it("opens the pop-up on the word", () => {
    const [lookup] = apply(saveCat);
    expect(lookup.popup?.chosen).toEqual(cat);
  });

  it("looks the word up", () => {
    const [, effects] = apply(saveCat);
    expect(effects).toContainEqual({
      type: "sendRequest",
      id: "lookup/flashcard/1",
      request: { kind: "lookupText", query: cat.word.query },
    });
  });

  it("waits for the lookup at most 1.5 seconds", () => {
    const [, effects] = apply(saveCat);
    expect(effects).toContainEqual({
      type: "startTimer",
      id: "lookup/flashcardWait",
      ms: 1500,
      action: actions.lookupFlashcardWaitEnded(1),
    });
  });

  it("names the word while it waits", () => {
    const [lookup] = apply(saveCat);
    expect(lookup.pendingFlashcard).toEqual({
      sequence: 1,
      chosen: cat,
      destination: "save",
      stage: "waiting",
    });
  });

  it("cancels the close of the pop-up on the second click of a double-click", () => {
    const click = actions.lookupWordClicked(cat, "mouse");
    const [, effects] = apply(saveCat, click, click);
    expect(effects).toContainEqual({ type: "cancelTimer", id: "lookup/close" });
  });

  it("is ready once the word's lookup answers", () => {
    const [lookup] = apply(lookupSettled(1, cat), saveCat);
    expect(lookup.pendingFlashcard?.stage).toBe("ready");
  });

  it("is ready once the word's lookup fails", () => {
    const failed = lookupSettled(1, cat, {
      ok: false,
      error: { status: 500, message: "down" },
    });
    const [lookup] = apply(failed, saveCat);
    expect(lookup.pendingFlashcard?.stage).toBe("ready");
  });

  it("closes the pop-up once ready", () => {
    const [lookup] = apply(lookupSettled(1, cat), saveCat);
    expect(lookup.popup).toBeNull();
  });

  it("keeps playback paused once ready", () => {
    const [, effects] = apply(
      actions.lookupClosed(),
      actions.playerPlayingChanged(true),
      saveCat,
      actions.playerPlayingChanged(false),
      lookupSettled(1, cat),
    );
    expect(effects).not.toContainEqual({ type: "playPlayer" });
  });

  it("stops waiting once ready", () => {
    const [, effects] = apply(lookupSettled(1, cat), saveCat);
    expect(effects).toContainEqual({
      type: "cancelTimer",
      id: "lookup/flashcardWait",
    });
  });

  it("starts late once the wait runs out", () => {
    const [lookup] = apply(actions.lookupFlashcardWaitEnded(1), saveCat);
    expect(lookup.pendingFlashcard?.stage).toBe("late");
  });

  it("stays late when the lookup answers after the wait", () => {
    const [lookup] = apply(
      lookupSettled(1, cat),
      saveCat,
      actions.lookupFlashcardWaitEnded(1),
    );
    expect(lookup.pendingFlashcard?.stage).toBe("late");
  });

  it("is ready at once when no dictionary covers the word's language", () => {
    const [lookup] = apply(
      actions.lookupFlashcardRequested(uncoveredCat, "save"),
    );
    expect(lookup.pendingFlashcard?.stage).toBe("ready");
  });

  it("sends nothing when no dictionary covers the word's language", () => {
    const [, effects] = apply(
      actions.lookupFlashcardRequested(uncoveredCat, "save"),
    );
    expect(effects.filter(({ type }) => type === "sendRequest")).toEqual([]);
  });

  it("ignores the answer to an earlier flashcard's lookup", () => {
    const [lookup] = apply(
      lookupSettled(1, cat),
      saveCat,
      actions.lookupFlashcardRequested(dog, "save"),
    );
    expect(lookup.pendingFlashcard?.stage).toBe("waiting");
  });

  it("ignores the wait of a flashcard dropped before it", () => {
    const [lookup] = apply(
      actions.lookupFlashcardWaitEnded(1),
      saveCat,
      actions.lookupClosed(),
      actions.lookupFlashcardRequested(dog, "save"),
    );
    expect(lookup.pendingFlashcard?.stage).toBe("waiting");
  });

  it("drops the flashcard when the pop-up closes", () => {
    const [lookup] = apply(actions.lookupClosed(), saveCat);
    expect(lookup.pendingFlashcard).toBeNull();
  });

  it("drops the flashcard when another word is clicked", () => {
    const [lookup] = apply(actions.lookupWordClicked(dog, "mouse"), saveCat);
    expect(lookup.pendingFlashcard).toBeNull();
  });

  it("drops the flashcard when a word is searched", () => {
    const [lookup] = apply(
      actions.lookupTermSearched({ term: "Hund", query: null }),
      saveCat,
    );
    expect(lookup.pendingFlashcard).toBeNull();
  });

  it("keeps the flashcard when the mouse rests on another word", () => {
    const [lookup] = apply(actions.lookupWordRestedOn(dog), saveCat);
    expect(lookup.pendingFlashcard?.chosen).toEqual(cat);
  });

  it("forgets the flashcard once it is taken", () => {
    const [lookup] = apply(
      actions.lookupFlashcardTaken(1),
      saveCat,
      lookupSettled(1, cat),
    );
    expect(lookup.pendingFlashcard).toBeNull();
  });

  it("numbers each flashcard after the one before", () => {
    const [lookup] = apply(
      actions.lookupFlashcardRequested(dog, "editor"),
      saveCat,
    );
    expect(lookup.pendingFlashcard?.sequence).toBe(2);
  });

  it("numbers a flashcard after a request still in flight from an earlier opening", () => {
    const [, effects] = apply(
      saveCat,
      saveCat,
      actions.closeMedia(),
      actions.openMediaFileRequested("p1", "m1"),
    );
    expect(effects).toContainEqual(
      expect.objectContaining({ id: lookupRequestId(2) }),
    );
  });

  it("shows a word held inside the pop-up with the word it opened on", () => {
    const katze = { term: "Katze", query: { text: "Katze", language: "de" } };
    const held = { ...cat, word: katze, occurrence: null };
    const [lookup] = apply(
      actions.lookupFlashcardRequested(held, "save"),
      actions.lookupWordClicked(dog, "mouse"),
    );
    expect(lookup.popup?.chosen).toEqual(dog);
  });
});
