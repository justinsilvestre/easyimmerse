import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import {
  applyToMediaScreenIn,
  mediaScreenAfter,
} from "../mediaScreen/mediaScreenTestSupport.ts";
import {
  applyToLookup as apply,
  cat,
  chosenWord,
  dog,
  holdInPopup,
  hoverSettled,
  restingOn,
  secondCue,
} from "./lookupTestSupport.ts";

const atInCat = chosenWord("at", 5);
const dogInSecondCue = chosenWord("dog", 4, secondCue);
const uncoveredCat = { ...cat, word: { term: "cat", query: null } };
const catAnswered = hoverSettled(1, cat, "cat");

describe("updateMediaScreen", () => {
  describe("for the dictionary pop-up", () => {
    describe("with the lookup cursor", () => {
      it("moves the cursor to the word pointed at", () => {
        const [lookup] = apply(
          actions.lookupCursorMoved(dog, "mouse"),
          actions.lookupCursorMoved(cat, "mouse"),
        );
        expect(lookup.cursor?.chosen).toEqual(dog);
      });

      it("keeps the lookup's identity when the cursor does not move", () => {
        const pointAtCat = actions.lookupCursorMoved(cat, "mouse");
        const before = mediaScreenAfter(pointAtCat);
        const [next] = applyToMediaScreenIn(before, pointAtCat);
        expect(next.lookup).toBe(before.screen.lookup);
      });

      it("takes the cursor away when the input that placed it leaves", () => {
        const [lookup] = apply(
          actions.lookupCursorLeft("mouse"),
          actions.lookupCursorMoved(cat, "mouse"),
        );
        expect(lookup.cursor).toBeNull();
      });

      it("takes the highlight off at once when the mouse moves to a word of another passage", () => {
        const [lookup] = apply(
          actions.lookupCursorMoved(dogInSecondCue, "mouse"),
          ...restingOn(cat),
          catAnswered,
        );
        expect(lookup.cursor?.matchedLength).toBeUndefined();
      });
    });

    describe("with a hovered word", () => {
      it("sends the word's lookup", () => {
        const [, effects] = apply(actions.lookupWordHovered(cat));
        expect(effects).toEqual([
          {
            type: "sendRequest",
            id: "lookup/hover/1",
            request: { kind: "lookupText", query: cat.word.query },
          },
        ]);
      });

      it("sends nothing for a word with nothing to look up", () => {
        const [, effects] = apply(actions.lookupWordHovered(uncoveredCat));
        expect(effects).toEqual([]);
      });

      it("places no cursor for a word with nothing to look up when nothing points at it", () => {
        const [lookup] = apply(actions.lookupWordHovered(uncoveredCat));
        expect(lookup.cursor).toBeNull();
      });

      it("knows at once that a word with nothing to look up matches nothing", () => {
        const [lookup] = apply(
          actions.lookupWordHovered(uncoveredCat),
          actions.lookupCursorMoved(uncoveredCat, "mouse"),
        );
        expect(lookup.cursor?.matchedLength).toBeNull();
      });

      it("fills the cursor's matched length when its hover lookup answers", () => {
        const [lookup] = apply(catAnswered, ...restingOn(cat));
        expect(lookup.cursor?.matchedLength).toBe(3);
      });

      it("counts a failed hover lookup as matching nothing", () => {
        const [lookup] = apply(hoverSettled(1, cat, null), ...restingOn(cat));
        expect(lookup.cursor?.matchedLength).toBeNull();
      });

      it("ignores a hover answer for a word the pointer has left", () => {
        const [lookup] = apply(
          catAnswered,
          ...restingOn(cat),
          actions.lookupCursorMoved(dog, "mouse"),
        );
        expect(lookup.cursor?.matchedLength).toBeUndefined();
      });

      it("moves the cursor to the word under the mouse within the highlight once that word's lookup answers", () => {
        const [lookup] = apply(
          hoverSettled(2, atInCat, "at"),
          ...restingOn(cat),
          catAnswered,
          ...restingOn(atInCat),
        );
        expect(lookup.cursor?.chosen).toEqual(atInCat);
      });

      it("moves an open pop-up to the word once its lookup answers", () => {
        const [lookup] = apply(
          hoverSettled(1, dog, "dog"),
          actions.lookupWordClicked(cat, "mouse"),
          ...restingOn(dog),
        );
        expect(lookup.popup?.chosen).toEqual(dog);
      });

      it("does not open the pop-up when its lookup answers", () => {
        const [lookup] = apply(catAnswered, ...restingOn(cat));
        expect(lookup.popup).toBeNull();
      });
    });

    describe("with L", () => {
      it("opens the pop-up at the cursor's word", () => {
        const [lookup] = apply(
          actions.lookupCursorLookedUp(),
          actions.lookupCursorMoved(cat, "keyboard"),
        );
        expect(lookup.popup).toEqual({ mode: "word", chosen: cat });
      });

      it("closes the pop-up when the cursor is on the word it shows", () => {
        const [lookup] = apply(
          actions.lookupCursorLookedUp(),
          actions.lookupWordClicked(cat, "mouse"),
          actions.lookupCursorMoved(cat, "keyboard"),
        );
        expect(lookup.popup).toBeNull();
      });

      it("opens the search field when there is no cursor", () => {
        const [lookup] = apply(actions.lookupCursorLookedUp());
        expect(lookup.popup).toEqual({ mode: "search", chosen: null });
      });
    });

    describe("with a word held in the pop-up", () => {
      it("starts a flashcard for it with the passage and place of the word the pop-up shows", () => {
        const [lookup] = apply(
          holdInPopup("Katze"),
          actions.lookupWordClicked(cat, "mouse"),
        );
        expect(lookup.pendingFlashcard?.chosen).toEqual({
          word: { term: "Katze", query: { text: "Katze", language: "de" } },
          source: cat.source,
          occurrence: null,
          anchor: cat.anchor,
        });
      });

      it("does nothing while the pop-up shows no word", () => {
        const [lookup] = apply(
          holdInPopup("Katze"),
          actions.lookupSearchOpened(),
        );
        expect(lookup.pendingFlashcard).toBeNull();
      });
    });
  });
});
