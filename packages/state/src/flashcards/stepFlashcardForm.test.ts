import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import {
  cat,
  requestCursorFlashcard,
  requestFlashcard,
} from "../screen/lookup/lookupTestSupport.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { exampleProject } from "../server/exampleProject.ts";
import { exampleListedFlashcard } from "./exampleFlashcards.ts";
import {
  appAfter,
  applied,
  createNew,
  failure,
  formAfter,
  hund,
  landed,
  settle,
  startNew,
  step,
  typeWord,
} from "./flashcardsTestSupport.ts";
import type { FormStep } from "./formStep.ts";

const save = actions.flashcardSaveRequested();
const openHund = actions.flashcardOpened("h", hund);
const lateCat = [
  requestFlashcard(cat, "editor"),
  actions.lookupFlashcardWaitEnded(1),
];

/** The probe of m1 finding that it shows pictures. */
const picturesFound = actions.requestSettled(
  "media/m1/pictures",
  {
    kind: "probePictures",
    file: {
      name: "m1.mp4",
      source: { kind: "browser_file", size: 1, last_modified_ms: 1 },
    },
  },
  { ok: true, data: true },
);

/** The flashcard ids and origins of the saves a step asks for. */
const savesOf = ({ effects }: FormStep) =>
  effects.flatMap((effect) =>
    effect.type === "sendRequest" && effect.request.kind === "saveFlashcard"
      ? [[effect.request.flashcardId, effect.request.purpose]]
      : [],
  );

const originsOf = (formStep: FormStep) =>
  savesOf(formStep).map(([id, purpose]) => [
    id,
    typeof purpose === "object" && purpose.type === "save" ? purpose.from : "",
  ]);

/** The app with hund changed to "Hündin" and left, so that its save is in flight as flashcard/1. */
const hundSaving = () => appAfter(openHund, typeWord("Hündin"), startNew("f2"));

/** The app with the new card f1 listed among the failed saves, its background save having failed. */
function failedF1(): AppState {
  const app = appAfter(startNew("f1", "Katze"), startNew("f2"));
  return applied(app, settle(app, "flashcard/1", failure(500)));
}

describe("stepFlashcardForm", () => {
  it("when another card is opened, saves the card it held in the background", () => {
    const app = appAfter(startNew("f1", "Katze"), typeWord("Kater"));
    expect(originsOf(step(app, startNew("f2")))).toEqual([
      ["f1", "background"],
    ]);
  });

  it("when the screen is left, saves the card it held in the background", () => {
    const app = appAfter(startNew("f1", "Katze"));
    expect(originsOf(step(app, actions.closeMedia()))).toEqual([
      ["f1", "background"],
    ]);
  });

  it("when the screen is left while a lookup flashcard waits, keeps the card waiting for its lookup", () => {
    const app = appAfter(...lateCat);
    expect(
      step(app, actions.closeMedia()).waiting.map(
        ({ card }) => card.flashcardId,
      ),
    ).toEqual(["f-cat"]);
  });

  it("when a flashcard is opened, starts from its latest content", () => {
    const app = hundSaving();
    expect(step(app, openHund).form?.card.editor.content.word).toBe("Hündin");
  });

  it("when a failed save is opened, keeps its flashcard id", () => {
    const opening = applied(
      failedF1(),
      actions.failedSaveOpened("f1", "p1", "m1"),
    );
    const app = applied(
      opening,
      settle(opening, "flashcards/opening/f1", {
        data: { media_files: [exampleMediaFile("m1", "m1.mp4")] },
      }),
    );
    const opened = settle(app, "flashcards/opening/f1/project", {
      data: exampleProject("p1"),
    });
    expect(step(app, opened).form?.card).toMatchObject({ flashcardId: "f1" });
  });

  it("when a save settles after another card was started, leaves the new card open", () => {
    const app = appAfter(startNew("f1", "Katze"), save, startNew("f2"));
    const saved = exampleListedFlashcard("f1", "Katze");
    expect(
      step(app, settle(app, "flashcard/1", landed(saved))).form?.card,
    ).toMatchObject({ flashcardId: "f2" });
  });

  it("when a saved card is reopened while its save is under way, keeps it open once that save lands", () => {
    const app = applied(hundSaving(), openHund);
    const saved = exampleListedFlashcard("h", "Hündin", 2);
    expect(
      step(app, settle(app, "flashcard/1", landed(saved))).form?.card,
    ).toMatchObject({ kind: "existing", flashcard: { id: "h" } });
  });

  it("when a flashcard is opened while its save waits behind another, shows the content last sent", () => {
    const app = applied(
      hundSaving(),
      openHund,
      typeWord("Hündchen"),
      startNew("f3"),
    );
    expect(step(app, openHund).form?.card.editor.content.word).toBe("Hündchen");
  });

  it("when a form save's time limit passes, unlocks the form and says the save failed", () => {
    const sending = appAfter(startNew("f1", "Katze"), save);
    const app = applied(
      sending,
      actions.requestTimeLimitPassed("flashcard/1"),
      settle(sending, "flashcard/1", failure("ABORTED")),
    );
    expect(formAfter(app)).toMatchObject({
      stage: "editing",
      saveFailure: "failed",
    });
  });

  describe("when Save is pressed", () => {
    it("sends the card from the form", () => {
      const app = appAfter(startNew("f1", "Katze"));
      expect(originsOf(step(app, save))).toEqual([["f1", "form"]]);
    });

    it("locks the form while the save is under way", () => {
      const app = appAfter(startNew("f1", "Katze"));
      expect(step(app, save).form?.stage).toBe("sending");
    });

    it("sends nothing more when Save is pressed again", () => {
      const app = appAfter(startNew("f1", "Katze"), save);
      expect(originsOf(step(app, save))).toEqual([]);
    });

    it("ignores an edit while the save is under way", () => {
      const app = appAfter(startNew("f1", "Katze"), save);
      expect(step(app, typeWord("Kater")).form?.card.editor.content.word).toBe(
        "Katze",
      );
    });

    it("closes the form once the save lands", () => {
      const app = appAfter(startNew("f1", "Katze"), save);
      const saved = exampleListedFlashcard("f1", "Katze");
      expect(
        step(app, settle(app, "flashcard/1", landed(saved))).form,
      ).toBeNull();
    });

    it("says that a refused save was refused", () => {
      const app = appAfter(startNew("f1", "Katze"), save);
      expect(
        step(app, settle(app, "flashcard/1", failure(422))).form?.saveFailure,
      ).toBe("refused");
    });

    it("stops saying the save failed once Save is pressed again", () => {
      const sending = appAfter(startNew("f1", "Katze"), save);
      const app = applied(
        sending,
        settle(sending, "flashcard/1", failure(500)),
      );
      expect(step(app, save).form?.saveFailure).toBeNull();
    });
  });

  describe("for a flashcard from a word that goes to the form", () => {
    it("opens it filled from its lookup once the fields are written", () => {
      const app = appAfter(requestFlashcard(cat, "editor"));
      const written = actions.flashcardFieldsWritten("lookup/flashcard/1", {
        word: "Katze",
        word_pronunciation: "",
        l1_definition: "cat",
        l2_definition: "",
      });
      expect(step(app, written).form?.card.editor.content.l1_definition).toBe(
        "cat",
      );
    });

    it("opens it awaiting its lookup once the wait runs out", () => {
      const app = appAfter(requestFlashcard(cat, "editor"));
      expect(step(app, actions.lookupFlashcardWaitEnded(1)).form?.stage).toBe(
        "awaitingLookup",
      );
    });

    it("fills the fields not typed in once a late answer arrives", () => {
      const app = appAfter(
        ...lateCat,
        actions.flashcardEdited({
          type: "textChanged",
          key: "l1_definition",
          value: "a pet",
        }),
      );
      const written = actions.flashcardFieldsWritten("lookup/flashcard/1", {
        word: "Katze",
        word_pronunciation: "",
        l1_definition: "cat",
        l2_definition: "",
      });
      expect(step(app, written).form?.card.editor.content).toMatchObject({
        word: "Katze",
        l1_definition: "a pet",
      });
    });

    it("gives up the lookup once the word is changed", () => {
      const app = appAfter(...lateCat);
      expect(step(app, typeWord("Kater")).form?.lookup).toBeNull();
    });

    it("waits for the lookup when Save is pressed before it answers", () => {
      const app = appAfter(...lateCat);
      expect(step(app, save).form?.stage).toBe("awaitingLookupToSave");
    });

    it("sends nothing while Save waits for the lookup", () => {
      const app = appAfter(...lateCat);
      expect(originsOf(step(app, save))).toEqual([]);
    });

    it("sends the card filled from the lookup once it answers after Save", () => {
      const app = appAfter(...lateCat, save);
      const written = actions.flashcardFieldsWritten(
        "lookup/flashcard/1",
        null,
      );
      expect(originsOf(step(app, written))).toEqual([["f-cat", "form"]]);
    });

    it("sends the card as it is once the wait from Save has run out", () => {
      const app = appAfter(...lateCat, save);
      expect(
        originsOf(step(app, actions.flashcardLookupWaitEnded("f-cat"))),
      ).toEqual([["f-cat", "form"]]);
    });
  });

  describe("when a card leaves the form", () => {
    it("leaves alone an unchanged saved card", () => {
      const app = appAfter(openHund);
      expect(originsOf(step(app, startNew("f2")))).toEqual([]);
    });

    it("leaves alone a card whose save is under way", () => {
      const app = appAfter(startNew("f1", "Katze"), save);
      expect(originsOf(step(app, startNew("f2")))).toEqual([]);
    });

    it("leaves the open card as it is for a card saved at once", () => {
      const app = appAfter(startNew("f1", "Katze"));
      expect(step(app, createNew("f2")).form?.card).toMatchObject({
        flashcardId: "f1",
      });
    });
  });

  describe("when the form is closed", () => {
    it("closes it", () => {
      const app = appAfter(startNew("f1", "Katze"));
      expect(step(app, actions.flashcardClosed()).form).toBeNull();
    });

    it("keeps it open while its save is under way", () => {
      const app = appAfter(startNew("f1", "Katze"), save);
      expect(step(app, actions.flashcardClosed()).form).not.toBeNull();
    });
  });

  describe("when a saved flashcard is deleted", () => {
    it("asks for its deletion", () => {
      const app = appAfter(openHund);
      const [deletion] = step(
        app,
        actions.flashcardDeleteRequested(),
      ).effects.filter((effect) => effect.type === "sendRequest");
      expect(deletion).toMatchObject({
        request: { kind: "deleteFlashcard", flashcardId: "h" },
      });
    });

    it("closes the form once the deletion lands", () => {
      const app = appAfter(openHund, actions.flashcardDeleteRequested());
      expect(
        step(app, settle(app, "flashcard/1", { data: undefined })).form,
      ).toBeNull();
    });

    it("keeps the form open when the deletion fails", () => {
      const app = appAfter(openHund, actions.flashcardDeleteRequested());
      expect(
        step(app, settle(app, "flashcard/1", failure(500))).form,
      ).not.toBeNull();
    });
  });

  it("closes a new card at once when it is deleted", () => {
    const app = appAfter(startNew("f1", "Katze"));
    expect(step(app, actions.flashcardDeleteRequested()).form).toBeNull();
  });

  it("opens a failed save with its edits, marked changed", () => {
    const app = appAfter(openHund, typeWord("Hündin"), startNew("f2"));
    const failed = applied(app, settle(app, "flashcard/1", failure(500)));
    expect(step(failed, openHund).form?.card).toMatchObject({
      isChanged: true,
      editor: { content: { word: "Hündin" } },
    });
  });

  it("opens a failed save never saved, with its edits, from its id alone", () => {
    expect(
      step(failedF1(), actions.flashcardOpened("f1", null)).form?.card,
    ).toMatchObject({ flashcardId: "f1", isChanged: true });
  });

  it("reopens a closed card with its edits on Undo", () => {
    const app = appAfter(startNew("f1", "Katze"), typeWord("Kater"));
    const closed = formAfter(app)?.card;
    if (!closed) throw new Error("No card is open.");
    expect(
      step(
        applied(app, actions.flashcardClosed()),
        actions.formDiscardUndone(closed),
      ).form?.card.editor.content.word,
    ).toBe("Kater");
  });

  it("opens a flashcard for no word when the E key is pressed with no cursor", () => {
    expect(
      step(appAfter(), requestCursorFlashcard("editor")).form?.card,
    ).toMatchObject({ flashcardId: "f-wordless" });
  });

  it("gives a new card a screenshot once the file is found to show pictures", () => {
    const app = appAfter(startNew("f1", "Katze"));
    expect(
      step(app, picturesFound).form?.card.editor.content.screenshot,
    ).not.toBeNull();
  });

  it("adds no screenshot while the card is being sent", () => {
    const app = appAfter(startNew("f1", "Katze"), save);
    expect(
      step(app, picturesFound).form?.card.editor.content.screenshot,
    ).toBeNull();
  });

  it("does nothing on another screen", () => {
    expect(
      step(applied(appAfter(), actions.closeMedia()), save).form,
    ).toBeNull();
  });

  it("puts the card in doubt when an earlier background save of its flashcard runs out of time", () => {
    const app = applied(hundSaving(), openHund);
    expect(
      step(app, settle(app, "flashcard/1", failure("ABORTED"))).form
        ?.rollbackIfDiscarded,
    ).toMatchObject({ content: { content: { word: "Hund" } } });
  });

  it("when an earlier background save of the open card fails, marks the card changed", () => {
    const app = applied(hundSaving(), openHund);
    expect(
      step(app, settle(app, "flashcard/1", failure(500))).form?.card.isChanged,
    ).toBe(true);
  });

  it("when a form save fails after its card left and was reopened, marks the card changed", () => {
    const app = appAfter(
      openHund,
      typeWord("Hündin"),
      save,
      startNew("f2"),
      openHund,
    );
    expect(
      step(app, settle(app, "flashcard/1", failure(500))).form?.card.isChanged,
    ).toBe(true);
  });

  it("when a later save of the open card's flashcard succeeds, takes the card out of doubt", () => {
    const reopened = applied(
      hundSaving(),
      openHund,
      typeWord("Hündchen"),
      startNew("f3"),
      openHund,
    );
    const app = applied(
      reopened,
      settle(reopened, "flashcard/1", failure("ABORTED")),
    );
    const saved = exampleListedFlashcard("h", "Hündchen", 3);
    expect(
      step(app, settle(app, "flashcard/3", landed(saved))).form
        ?.rollbackIfDiscarded,
    ).toBeNull();
  });
});
