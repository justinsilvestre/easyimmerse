import { describe, expect, it } from "vitest";
import { actions } from "../../app/appAction.ts";
import {
  applyToLookup as apply,
  cat,
  dog,
  hoverSettled,
  requestFlashcard,
  restingOn,
} from "./lookupTestSupport.ts";

/** The answer of the hover lookup with this sequence for "dog". */
const dogAnswered = (sequence: number) => hoverSettled(sequence, dog, "dog");
const clickedCat = actions.lookupWordClicked(cat, "mouse");
const playing = actions.playerPlayingChanged(true);
const paused = actions.playerPlayingChanged(false);
const closeTimer = {
  type: "startTimer",
  id: "lookup/close",
  ms: 500,
  action: actions.lookupCloseDue(),
};

describe("updateMediaScreen", () => {
  describe("for the dictionary pop-up", () => {
    it("opens the pop-up on a clicked word", () => {
      const [lookup] = apply(clickedCat);
      expect(lookup.popup).toEqual({ mode: "word", chosen: cat });
    });

    it("closes after the double-click interval when the word it shows is clicked again", () => {
      const [, effects] = apply(clickedCat, clickedCat);
      expect(effects).toEqual([closeTimer]);
    });

    it("closes after the double-click interval when the word it shows is tapped again", () => {
      const [, effects] = apply(
        actions.lookupWordClicked(cat, "touch"),
        clickedCat,
      );
      expect(effects).toEqual([closeTimer]);
    });

    it("closes at once when the word it shows is activated from the keyboard", () => {
      const [lookup] = apply(
        actions.lookupWordClicked(cat, "keyboard"),
        clickedCat,
      );
      expect(lookup.popup).toBeNull();
    });

    it("closes once the double-click interval has passed", () => {
      const [lookup] = apply(actions.lookupCloseDue(), clickedCat, clickedCat);
      expect(lookup.popup).toBeNull();
    });

    it("moves to another clicked word", () => {
      const [lookup] = apply(
        actions.lookupWordClicked(dog, "touch"),
        clickedCat,
      );
      expect(lookup.popup?.chosen).toEqual(dog);
    });

    it("cancels the close when another word is clicked", () => {
      const [, effects] = apply(
        actions.lookupWordClicked(dog, "mouse"),
        clickedCat,
        clickedCat,
      );
      expect(effects).toContainEqual({
        type: "cancelTimer",
        id: "lookup/close",
      });
    });

    it("follows a word the pointer rests on", () => {
      const [lookup] = apply(dogAnswered(1), clickedCat, ...restingOn(dog));
      expect(lookup.popup?.chosen).toEqual(dog);
    });

    it("does not open for a word the pointer rests on", () => {
      const [lookup] = apply(dogAnswered(1), ...restingOn(dog));
      expect(lookup.popup).toBeNull();
    });

    it("stays on its word while the pointer is inside it", () => {
      const [lookup] = apply(
        dogAnswered(1),
        clickedCat,
        actions.lookupPointerInsideChanged(true),
        ...restingOn(dog),
      );
      expect(lookup.popup?.chosen).toEqual(cat);
    });

    it("follows the pointer again once it has left the pop-up", () => {
      const [lookup] = apply(
        dogAnswered(1),
        clickedCat,
        actions.lookupPointerInsideChanged(true),
        actions.lookupPointerInsideChanged(false),
        ...restingOn(dog),
      );
      expect(lookup.popup?.chosen).toEqual(dog);
    });

    it("stays on its word while a flashcard waits for its lookup", () => {
      const [lookup] = apply(
        dogAnswered(2),
        requestFlashcard(cat),
        ...restingOn(dog),
      );
      expect(lookup.popup?.chosen).toEqual(cat);
    });

    it("does not follow the pointer while it shows its search field", () => {
      const [lookup] = apply(
        dogAnswered(1),
        actions.lookupSearchOpened(),
        ...restingOn(dog),
      );
      expect(lookup.popup?.chosen).toBeNull();
    });

    it("opens on its search field", () => {
      const [lookup] = apply(actions.lookupSearchOpened());
      expect(lookup.popup).toEqual({ mode: "search", chosen: null });
    });

    it("shows a searched word at the place of the word it opened on", () => {
      const [lookup] = apply(
        actions.lookupTermSearched({ term: "Hund", query: null }),
        clickedCat,
      );
      expect(lookup.popup?.chosen).toEqual({
        ...cat,
        word: { term: "Hund", query: null },
        occurrence: null,
      });
    });

    it("changes nothing for a blank search", () => {
      const [lookup] = apply(
        actions.lookupTermSearched({ term: "", query: null }),
        clickedCat,
      );
      expect(lookup.popup?.chosen).toEqual(cat);
    });

    it("closes", () => {
      const [lookup] = apply(actions.lookupClosed(), clickedCat);
      expect(lookup.popup).toBeNull();
    });

    it("forgets the pointer inside once it closes", () => {
      const [lookup] = apply(
        actions.lookupClosed(),
        clickedCat,
        actions.lookupPointerInsideChanged(true),
      );
      expect(lookup.isPointerInside).toBe(false);
    });

    it("keeps its size through closing", () => {
      const [lookup] = apply(
        clickedCat,
        actions.lookupSizeToggled(),
        actions.lookupClosed(),
      );
      expect(lookup.size).toBe("expanded");
    });

    it("returns to its compact size when toggled again", () => {
      const [lookup] = apply(
        actions.lookupSizeToggled(),
        actions.lookupSizeToggled(),
      );
      expect(lookup.size).toBe("compact");
    });

    describe("with playback", () => {
      it("pauses playing playback when the pop-up opens", () => {
        const [, effects] = apply(clickedCat, playing);
        expect(effects).toContainEqual({ type: "pausePlayer" });
      });

      it("leaves paused playback alone when the pop-up opens", () => {
        const [, effects] = apply(clickedCat);
        expect(effects).not.toContainEqual({ type: "pausePlayer" });
      });

      it("pauses playing playback when the search field opens", () => {
        const [, effects] = apply(actions.lookupSearchOpened(), playing);
        expect(effects).toContainEqual({ type: "pausePlayer" });
      });

      it("resumes the playback it paused when the pop-up closes", () => {
        const [, effects] = apply(
          actions.lookupClosed(),
          playing,
          clickedCat,
          paused,
        );
        expect(effects).toContainEqual({ type: "playPlayer" });
      });

      it("resumes nothing when it paused nothing", () => {
        const [, effects] = apply(actions.lookupClosed(), clickedCat);
        expect(effects).not.toContainEqual({ type: "playPlayer" });
      });

      it("leaves playback alone on closing once the user has resumed it by hand", () => {
        const [, effects] = apply(
          actions.lookupClosed(),
          playing,
          clickedCat,
          paused,
          playing,
          paused,
        );
        expect(effects).not.toContainEqual({ type: "playPlayer" });
      });

      it("keeps playback paused when the pop-up is set aside", () => {
        const [, effects] = apply(
          actions.lookupSetAside(),
          playing,
          clickedCat,
          paused,
        );
        expect(effects).not.toContainEqual({ type: "playPlayer" });
      });

      it("keeps playback paused once the pop-up set aside closes again", () => {
        const [, effects] = apply(
          actions.lookupClosed(),
          playing,
          clickedCat,
          paused,
          actions.lookupSetAside(),
          actions.lookupSearchOpened(),
        );
        expect(effects).not.toContainEqual({ type: "playPlayer" });
      });
    });
  });
});
