import { describe, expect, it } from "vitest";
import { actions } from "../app/appAction.ts";
import type { AppState } from "../app/appState.ts";
import type { NoticeContent } from "../notices/noticesState.ts";
import {
  cat,
  dog,
  holdInPopup,
  requestCursorFlashcard,
  requestFlashcard,
} from "../screen/lookup/lookupTestSupport.ts";
import { selectFlashcardForm } from "../screen/mediaScreen/mediaScreenSelectors.ts";
import { exampleMediaFile } from "../server/exampleMediaFile.ts";
import { exampleProject } from "../server/exampleProject.ts";
import {
  exampleContext,
  exampleDraft,
  exampleListedFlashcard,
} from "./exampleFlashcards.ts";
import { selectFailedSaves } from "./failedSaveSelectors.ts";
import { flashcardIdOf } from "./flashcardCard.ts";
import {
  appAfter,
  applied,
  failure,
  flashcardEffects,
  heldCardIds,
  hund,
  landed,
  noticesShown,
  requestsAsked,
  selectRequestIds,
  settle,
  startNew,
  typeWord,
} from "./flashcardsTestSupport.ts";

const save = actions.flashcardSaveRequested();
const close = actions.flashcardClosed();
const openHund = actions.flashcardOpened("h", hund);

/** The app with hund changed to "Hündin" and left, so that its background save is in flight as flashcard/h/1. */
const hundSaving = () => appAfter(openHund, typeWord("Hündin"), startNew("f2"));

/** The app with hund's background save failed for the given status, so that hund is a failed save. */
function hundFailed(status: number | "ABORTED" = 500): AppState {
  const app = hundSaving();
  return applied(app, settle(app, "flashcard/h/1", failure(status)));
}

/** The app with the new card f1's background save, flashcard/f1/1, timed out, so that f1 is a failed save in doubt. */
function f1TimedOut(): AppState {
  const app = appAfter(startNew("f1", "Katze"), startNew("f2"));
  return applied(
    app,
    actions.requestTimeLimitPassed("flashcard/f1/1"),
    settle(app, "flashcard/f1/1", failure("ABORTED")),
  );
}

const mediaFiles = {
  data: { media_files: [exampleMediaFile("m1", "m1.mp4")] },
};
const project = { data: exampleProject("p1") };

/** The app with hund's failed save opened on m1, its media files and then its project having arrived. */
function hundOpened(): AppState {
  const app = applied(hundFailed(), actions.failedSaveOpened("h", "p1", "m1"));
  const withFiles = applied(
    app,
    settle(app, "flashcards/opening/h", mediaFiles),
  );
  return applied(
    withFiles,
    settle(withFiles, "flashcards/opening/h/project", project),
  );
}

/** Chooses the action of a notice's button by its label. */
function buttonOf(notice: NoticeContent | undefined, label: string) {
  const button = notice?.buttons.find((each) => each.label === label);
  if (!button || !("action" in button)) throw new Error(`No ${label} button.`);
  return button.action;
}

const failedIds = (app: AppState) =>
  selectFailedSaves(app).map(({ card }) => flashcardIdOf(card));

describe("flashcardCommands", () => {
  it("when a changed form is closed, offers an undo toast that reopens the card", () => {
    const app = appAfter(startNew("f1", "Katze"), typeWord("Kater"));
    const [toast] = noticesShown(app, close);
    const reopened = applied(app, close, buttonOf(toast, "Undo"));
    expect(selectFlashcardForm(reopened)?.card.editor.content.word).toBe(
      "Kater",
    );
  });

  it("when a failed save is discarded, offers an undo toast that lists it again", () => {
    const app = hundFailed();
    const discard = actions.failedSaveDiscarded("h");
    const [toast] = noticesShown(app, discard);
    expect(failedIds(applied(app, discard, buttonOf(toast, "Undo")))).toEqual([
      "h",
    ]);
  });

  it("when a form whose save failed is closed, lists the card instead of discarding it", () => {
    const sending = appAfter(startNew("f1", "Katze"), save);
    const app = applied(
      sending,
      settle(sending, "flashcard/f1/1", failure(500)),
    );
    expect(failedIds(applied(app, close))).toEqual(["f1"]);
  });

  it("sends every flashcard request with the scope of its flashcard", () => {
    const app = appAfter(startNew("f1", "Katze"));
    expect(requestsAsked(app, save).map(({ scope }) => scope)).toEqual([
      "flashcard:f1",
    ]);
  });

  it("when Undo is chosen, sends the earlier content in the flashcard's scope", () => {
    const app = hundSaving();
    const [toast] = noticesShown(
      app,
      settle(
        app,
        "flashcard/h/1",
        landed(exampleListedFlashcard("h", "Hündin", 2)),
      ),
    );
    const [undo] = requestsAsked(app, buttonOf(toast, "Undo"));
    expect(undo).toMatchObject({
      scope: "flashcard:h",
      request: { kind: "saveFlashcard", draft: { content: { word: "Hund" } } },
    });
  });

  it("when a failed save is retried, sends it under the id of its first save", () => {
    const app = applied(appAfter(startNew("f1", "Katze"), startNew("f2")));
    const failed = applied(app, settle(app, "flashcard/f1/1", failure(500)));
    const [retry] = requestsAsked(failed, actions.failedSaveRetried("f1"));
    expect(retry?.request).toMatchObject({ flashcardId: "f1", isNew: true });
  });

  it("numbers a request after the requests of its flashcard still in flight", () => {
    const app = applied(hundSaving(), openHund, typeWord("Hündchen"));
    expect(requestsAsked(app, startNew("f3")).map(({ id }) => id)).toEqual([
      "flashcard/h/2",
    ]);
  });

  it("when a background save fails, sends nothing more", () => {
    const app = hundSaving();
    expect(
      requestsAsked(app, settle(app, "flashcard/h/1", failure(500))),
    ).toEqual([]);
  });

  it("when a timed-out save settles, sends nothing more", () => {
    const app = applied(
      hundSaving(),
      actions.requestTimeLimitPassed("flashcard/h/1"),
    );
    expect(
      requestsAsked(app, settle(app, "flashcard/h/1", failure("ABORTED"))),
    ).toEqual([]);
  });

  it("when a form save lands after its card left the form, offers no undo toast", () => {
    const app = appAfter(startNew("f1", "Katze"), save, startNew("f2"));
    expect(
      noticesShown(
        app,
        settle(
          app,
          "flashcard/f1/1",
          landed(exampleListedFlashcard("f1", "Katze")),
        ),
      ),
    ).toEqual([]);
  });

  it("when a form save fails after its card left the form, lists the card", () => {
    const app = appAfter(startNew("f1", "Katze"), save, startNew("f2"));
    expect(
      failedIds(applied(app, settle(app, "flashcard/f1/1", failure(500)))),
    ).toEqual(["f1"]);
  });

  it("when a card is saved again while its save is under way, asks for the second save in the same scope", () => {
    const app = applied(hundSaving(), openHund, typeWord("Hündchen"));
    expect(requestsAsked(app, save).map(({ scope }) => scope)).toEqual([
      "flashcard:h",
    ]);
  });

  it("when Undo follows a save, asks for it in the same scope", () => {
    const app = hundSaving();
    const undo = actions.saveUndoRequested({
      projectId: "p1",
      flashcardId: "h",
      word: "Hündin",
      before: exampleDraft("Hund"),
    });
    expect(requestsAsked(app, undo).map(({ scope }) => scope)).toEqual([
      "flashcard:h",
    ]);
  });

  it("when a deletion follows a save, asks for it in the same scope", () => {
    const app = applied(hundSaving(), openHund);
    expect(
      requestsAsked(app, actions.flashcardDeleteRequested()).map(
        ({ scope }) => scope,
      ),
    ).toEqual(["flashcard:h"]);
  });

  it("when Undo follows a save that waits behind another, puts back the content from before that save", () => {
    const app = applied(
      hundSaving(),
      openHund,
      typeWord("Hündchen"),
      startNew("f3"),
    );
    const [first, second] = selectRequestIds(app, "h");
    if (!first || !second) throw new Error("Hund has no two saves.");
    const firstLanded = applied(
      app,
      settle(app, first, landed(exampleListedFlashcard("h", "Hündin", 2))),
    );
    const [toast] = noticesShown(
      firstLanded,
      settle(
        firstLanded,
        second,
        landed(exampleListedFlashcard("h", "Hündchen", 3)),
      ),
    );
    expect(buttonOf(toast, "Undo")).toMatchObject({
      undo: { before: { content: { word: "Hündin" } } },
    });
  });

  it("when a save's time limit passes, gives its card a rollback", () => {
    expect(selectFailedSaves(f1TimedOut())[0]?.rollbackIfDiscarded).toEqual({
      content: null,
      retryRequestId: null,
    });
  });

  it("when a card in doubt is discarded, deletes a new flashcard", () => {
    const [rollback] = requestsAsked(
      f1TimedOut(),
      actions.failedSaveDiscarded("f1"),
    );
    expect(rollback?.request).toMatchObject({
      kind: "deleteFlashcard",
      flashcardId: "f1",
    });
  });

  it("when a card in doubt is discarded, puts back a saved flashcard's earlier content", () => {
    const [rollback] = requestsAsked(
      hundFailed("ABORTED"),
      actions.failedSaveDiscarded("h"),
    );
    expect(rollback?.request).toMatchObject({
      kind: "saveFlashcard",
      draft: { content: { word: "Hund" } },
    });
  });

  it("when a refused card is discarded, sends no rollback", () => {
    expect(
      requestsAsked(hundFailed(422), actions.failedSaveDiscarded("h")),
    ).toEqual([]);
  });

  it("when a later save of the flashcard succeeds, clears its rollback", () => {
    const app = applied(f1TimedOut(), actions.failedSaveRetried("f1"));
    const [retry] = selectRequestIds(app, "f1");
    if (!retry) throw new Error("No Retry was sent.");
    const retried = applied(
      app,
      settle(app, retry, landed(exampleListedFlashcard("f1", "Katze"))),
    );
    expect(selectFailedSaves(retried)).toEqual([]);
  });

  it("when a closed form in doubt is discarded from the status line, sends its rollback", () => {
    const sending = appAfter(openHund, typeWord("Hündin"), save);
    const timedOut = applied(
      sending,
      actions.requestTimeLimitPassed("flashcard/h/1"),
      settle(sending, "flashcard/h/1", failure("ABORTED")),
      close,
    );
    const [rollback] = requestsAsked(
      timedOut,
      actions.failedSaveDiscarded("h"),
    );
    expect(rollback?.request).toMatchObject({
      kind: "saveFlashcard",
      draft: { content: { word: "Hund" } },
    });
  });

  it("when a rollback deletion answers 404, counts it as done", () => {
    const app = applied(f1TimedOut(), actions.failedSaveDiscarded("f1"));
    const [rollback] = selectRequestIds(app, "f1");
    if (!rollback) throw new Error("No rollback was sent.");
    expect(noticesShown(app, settle(app, rollback, failure(404)))).toEqual([]);
  });

  it("when a form opened during a Retry is closed, takes the Retry back", () => {
    const app = applied(hundFailed(), actions.failedSaveRetried("h"), openHund);
    const [rollback] = requestsAsked(app, close);
    expect(rollback?.request).toMatchObject({
      kind: "saveFlashcard",
      draft: { content: { word: "Hund" } },
      purpose: { type: "rollback" },
    });
  });

  describe("when a background save lands", () => {
    it("offers Undo in a notice naming the card", () => {
      const app = hundSaving();
      const [toast] = noticesShown(
        app,
        settle(
          app,
          "flashcard/h/1",
          landed(exampleListedFlashcard("h", "Hündin", 2)),
        ),
      );
      expect(toast?.message).toBe("Saved the flashcard for “Hündin”.");
    });

    it("deletes a new card on Undo", () => {
      const app = appAfter(startNew("f1", "Katze"), startNew("f2"));
      const [toast] = noticesShown(
        app,
        settle(
          app,
          "flashcard/f1/1",
          landed(exampleListedFlashcard("f1", "Katze")),
        ),
      );
      const [undo] = requestsAsked(app, buttonOf(toast, "Undo"));
      expect(undo?.request).toMatchObject({
        kind: "deleteFlashcard",
        flashcardId: "f1",
      });
    });

    it("tells of an Undo that fails", () => {
      const app = applied(
        hundSaving(),
        actions.saveUndoRequested({
          projectId: "p1",
          flashcardId: "h",
          word: "Hündin",
          before: exampleDraft("Hund"),
        }),
      );
      const [, undo] = selectRequestIds(app, "h");
      if (!undo) throw new Error("No Undo was sent.");
      const [notice] = noticesShown(app, settle(app, undo, failure(500)));
      expect(notice?.message).toBe(
        "Couldn't undo the save of the flashcard for “Hündin”.",
      );
    });
  });

  it("withdraws the Undo of a flashcard's save once it opens in the form", () => {
    const app = hundSaving();
    expect(flashcardEffects(app, openHund)).toContainEqual({
      type: "withdrawNotice",
      key: "saveUndo:h",
    });
  });

  it("shows no undo toast for a save the user asked for whose card waited for its lookup", () => {
    const app = appAfter(
      requestFlashcard(cat, "editor"),
      actions.lookupFlashcardWaitEnded("f-cat"),
      save,
      startNew("f2"),
      actions.flashcardLookupWaitEnded("f-cat"),
    );
    const [request] = app.operations.requests.filter(
      ({ request }) =>
        request.kind === "saveFlashcard" && request.flashcardId === "f-cat",
    );
    if (!request) throw new Error("No save of f-cat.");
    expect(
      noticesShown(
        app,
        settle(app, request.id, landed(exampleListedFlashcard("f-cat", "cat"))),
      ),
    ).toEqual([]);
  });

  it("when the C key is pressed with no cursor, saves a flashcard for no word", () => {
    expect(
      requestsAsked(appAfter(), requestCursorFlashcard(null)).map(
        ({ request }) => request.flashcardId,
      ),
    ).toEqual(["f-wordless"]);
  });

  it("when the C key is pressed at a cursor, saves no flashcard for no word", () => {
    const app = appAfter(actions.lookupCursorMoved(cat, "mouse"));
    expect(requestsAsked(app, requestCursorFlashcard(cat))).toEqual([]);
  });

  it("when a flashcard for a word no dictionary covers is asked for, saves it at once", () => {
    const app = appAfter(requestFlashcard(cat));
    const uncoveredDog = { ...dog, word: { term: "dog", query: null } };
    expect(
      requestsAsked(app, requestFlashcard(uncoveredDog)).map(
        ({ request }) => request.flashcardId,
      ),
    ).toEqual(["f-dog"]);
  });

  it("when a flashcard for a word no dictionary covers is asked for, keeps the waiting word's flashcard pending", () => {
    const app = appAfter(requestFlashcard(cat));
    const uncoveredDog = { ...dog, word: { term: "dog", query: null } };
    expect(
      heldCardIds(
        applied(
          app,
          requestFlashcard(uncoveredDog),
          actions.lookupFlashcardWaitEnded("f-cat"),
        ),
      ),
    ).toEqual(["f-cat"]);
  });

  describe("for a flashcard from a word saved at once", () => {
    it("saves it filled from its lookup once the fields are written", () => {
      const app = appAfter(requestFlashcard(cat));
      const written = actions.flashcardFieldsWritten("lookup/flashcard/f-cat", {
        word: "Katze",
        word_pronunciation: "",
        l1_definition: "cat",
        l2_definition: "",
      });
      const [saved] = requestsAsked(app, written);
      expect(saved?.request).toMatchObject({
        draft: { content: { word: "Katze", l1_definition: "cat" } },
      });
    });

    it("asks for the fields of its lookup once the lookup settles", () => {
      const app = appAfter(requestFlashcard(cat));
      const settled = settle(app, "lookup/flashcard/f-cat", {
        data: { results: [], kanji: [], stylesheets: [] },
      });
      expect(flashcardEffects(app, settled)).toContainEqual({
        type: "writeFlashcardFields",
        requestId: "lookup/flashcard/f-cat",
        results: [],
        context: exampleContext,
      });
    });

    it("keeps it waiting for its lookup once the 1.5-second wait runs out", () => {
      const app = appAfter(requestFlashcard(cat));
      expect(
        heldCardIds(applied(app, actions.lookupFlashcardWaitEnded("f-cat"))),
      ).toEqual(["f-cat"]);
    });

    it("saves the waiting card filled from a late answer", () => {
      const app = appAfter(
        requestFlashcard(cat),
        actions.lookupFlashcardWaitEnded("f-cat"),
      );
      const written = actions.flashcardFieldsWritten(
        "lookup/flashcard/f-cat",
        null,
      );
      expect(
        requestsAsked(app, written).map(({ request }) => request.flashcardId),
      ).toEqual(["f-cat"]);
    });

    it("saves the waiting card as it is once ten seconds have passed", () => {
      const app = appAfter(
        requestFlashcard(cat),
        actions.lookupFlashcardWaitEnded("f-cat"),
      );
      expect(
        requestsAsked(app, actions.flashcardLookupWaitEnded("f-cat")).map(
          ({ request }) => request.flashcardId,
        ),
      ).toEqual(["f-cat"]);
    });

    it("when the screen is left while a word's flashcard waits for its lookup, keeps it waiting", () => {
      const app = appAfter(requestFlashcard(cat, "editor"));
      expect(heldCardIds(applied(app, actions.closeMedia()))).toEqual([
        "f-cat",
      ]);
    });

    it.each([
      ["the pop-up is closed", actions.lookupClosed()],
      ["the pop-up's close timer ends", actions.lookupCloseDue()],
      ["the pop-up is set aside", actions.lookupSetAside()],
      ["another word is clicked", actions.lookupWordClicked(dog, "mouse")],
      ["the L key is pressed", actions.lookupCursorLookedUp()],
      ["the search field is opened", actions.lookupSearchOpened()],
      [
        "a word is searched",
        actions.lookupTermSearched({ term: "Hund", query: null }),
      ],
      ["another word's flashcard is asked for", requestFlashcard(dog)],
      ["a word in the pop-up is held", holdInPopup("Katze")],
    ])("when %s before its lookup answers, keeps it waiting", (_, action) => {
      const app = appAfter(requestFlashcard(cat));
      expect(heldCardIds(applied(app, action))).toEqual(["f-cat"]);
    });

    it("when the pop-up is closed while a word's flashcard for the form waits for its lookup, keeps it waiting", () => {
      const app = appAfter(requestFlashcard(cat, "editor"));
      expect(heldCardIds(applied(app, actions.lookupClosed()))).toEqual([
        "f-cat",
      ]);
    });

    it("when the C key is pressed on another word before its lookup answers, keeps it waiting", () => {
      const app = appAfter(
        actions.lookupCursorMoved(dog, "mouse"),
        requestFlashcard(cat),
      );
      expect(heldCardIds(applied(app, requestCursorFlashcard(dog)))).toEqual([
        "f-cat",
      ]);
    });

    it("when its word is clicked again with the mouse, leaves it pending", () => {
      const app = appAfter(requestFlashcard(cat));
      expect(
        heldCardIds(applied(app, actions.lookupWordClicked(cat, "mouse"))),
      ).toEqual([]);
    });
  });

  describe("for a refused save", () => {
    it("shows a notice with Open and Discard", () => {
      const app = hundSaving();
      const [notice] = noticesShown(
        app,
        settle(app, "flashcard/h/1", failure(422)),
      );
      expect(notice?.buttons.map(({ label }) => label)).toEqual([
        "Open",
        "Discard",
      ]);
    });

    it("lists the card as refused", () => {
      expect(selectFailedSaves(hundFailed(422))[0]?.isRefused).toBe(true);
    });

    it("sends nothing on Retry", () => {
      expect(
        requestsAsked(hundFailed(422), actions.failedSaveRetried("h")),
      ).toEqual([]);
    });
  });

  describe("on Open of a failed save", () => {
    it("marks it as opening", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      expect(selectFailedSaves(app)[0]?.isOpening).toBe(true);
    });

    it("says it could not be opened when its media file is gone", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      const [notice] = noticesShown(
        app,
        settle(app, "flashcards/opening/h", { data: { media_files: [] } }),
      );
      expect(notice?.message).toBe(
        "Couldn't open the flashcard for “Hündin”. It is still listed among the flashcards not saved.",
      );
    });

    it("says it could not be opened when the media files fail to load", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      const [notice] = noticesShown(
        app,
        settle(app, "flashcards/opening/h", failure(500)),
      );
      expect(notice?.message).toBe(
        "Couldn't open the flashcard for “Hündin”. It is still listed among the flashcards not saved.",
      );
    });

    it("keeps it listed when the media files fail to load", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      expect(
        failedIds(
          applied(app, settle(app, "flashcards/opening/h", failure(500))),
        ),
      ).toEqual(["h"]);
    });

    it("gives up its opening once the user goes elsewhere first", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      expect(flashcardEffects(app, actions.closeMedia())).toContainEqual({
        type: "abortRequest",
        id: "flashcards/opening/h",
      });
    });

    it("asks for the project on the way", () => {
      expect(
        flashcardEffects(
          hundFailed(),
          actions.failedSaveOpened("h", "p1", "m1"),
        ),
      ).toContainEqual({
        type: "sendRequest",
        id: "flashcards/opening/h/project",
        request: { kind: "getProject", projectId: "p1" },
      });
    });

    it("says it could not be opened when the project fails to load", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      const [notice] = noticesShown(
        app,
        settle(app, "flashcards/opening/h/project", failure(500)),
      );
      expect(notice?.message).toBe(
        "Couldn't open the flashcard for “Hündin”. It is still listed among the flashcards not saved.",
      );
    });

    it("says it could not be opened when the project fails to load after the media files arrived", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      const withFiles = applied(
        app,
        settle(app, "flashcards/opening/h", mediaFiles),
      );
      const [notice] = noticesShown(
        withFiles,
        settle(withFiles, "flashcards/opening/h/project", failure(500)),
      );
      expect(notice?.message).toBe(
        "Couldn't open the flashcard for “Hündin”. It is still listed among the flashcards not saved.",
      );
    });

    it("says nothing of a failure that arrives after the user went elsewhere", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
        actions.closeMedia(),
      );
      expect(
        noticesShown(app, settle(app, "flashcards/opening/h", failure(500))),
      ).toEqual([]);
    });

    it("keeps it listed while the project is still loading", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      expect(
        failedIds(
          applied(app, settle(app, "flashcards/opening/h", mediaFiles)),
        ),
      ).toEqual(["h"]);
    });

    it("takes it off the list once the form takes it", () => {
      expect(failedIds(hundOpened())).toEqual([]);
    });

    it("takes it off the list once the media files arrive after the project", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveOpened("h", "p1", "m1"),
      );
      const withProject = applied(
        app,
        settle(app, "flashcards/opening/h/project", project),
      );
      expect(
        failedIds(
          applied(
            withProject,
            settle(withProject, "flashcards/opening/h", mediaFiles),
          ),
        ),
      ).toEqual([]);
    });
  });

  describe("while a Retry is under way", () => {
    it("does nothing on Discard", () => {
      const app = applied(hundFailed(), actions.failedSaveRetried("h"));
      expect(failedIds(applied(app, actions.failedSaveDiscarded("h")))).toEqual(
        ["h"],
      );
    });

    it("sends nothing on a second Retry", () => {
      const app = applied(hundFailed(), actions.failedSaveRetried("h"));
      expect(requestsAsked(app, actions.failedSaveRetried("h"))).toEqual([]);
    });

    it("keeps the card listed when the Retry fails", () => {
      const app = applied(hundFailed(), actions.failedSaveRetried("h"));
      expect(
        failedIds(
          applied(app, settle(app, "flashcard/h/background/1", failure(500))),
        ),
      ).toEqual(["h"]);
    });

    it("takes the card off the list once the Retry lands", () => {
      const app = applied(hundFailed(), actions.failedSaveRetried("h"));
      expect(
        failedIds(
          applied(
            app,
            settle(
              app,
              "flashcard/h/background/1",
              landed(exampleListedFlashcard("h", "Hündin", 2)),
            ),
          ),
        ),
      ).toEqual([]);
    });

    it("leaves an opened card to the form when the Retry fails", () => {
      const app = applied(
        hundFailed(),
        actions.failedSaveRetried("h"),
        openHund,
      );
      expect(
        failedIds(
          applied(app, settle(app, "flashcard/h/background/1", failure(500))),
        ),
      ).toEqual([]);
    });
  });

  it("withdraws the undo toasts of closed forms once the screen is left", () => {
    const app = appAfter(startNew("f1", "Katze"), typeWord("Kater"));
    const closed = applied(
      app,
      ...noticesShown(app, close).map((content) =>
        actions.noticeRequested(content),
      ),
      close,
    );
    expect(flashcardEffects(closed, actions.closeMedia())).toContainEqual({
      type: "withdrawNotice",
      key: "formDiscarded:f1",
    });
  });

  it("keeps a failed save listed when an Undo of an earlier save of its flashcard lands", () => {
    const app = applied(
      hundFailed(),
      actions.saveUndoRequested({
        projectId: "p1",
        flashcardId: "h",
        word: "Hund",
        before: exampleDraft("Hund"),
      }),
    );
    const [undo] = selectRequestIds(app, "h");
    if (!undo) throw new Error("No Undo was sent.");
    const landing = settle(
      app,
      undo,
      landed(exampleListedFlashcard("h", "Hund", 2)),
    );
    expect(failedIds(applied(app, landing))).toEqual(["h"]);
  });

  describe("while the form holds a flashcard", () => {
    it("does not list it when an earlier background save of it fails", () => {
      const app = applied(hundSaving(), openHund);
      expect(
        failedIds(applied(app, settle(app, "flashcard/h/1", failure(500)))),
      ).toEqual([]);
    });

    it("does not list it again on Undo of its discard from the list", () => {
      const failed = hundFailed();
      const [toast] = noticesShown(failed, actions.failedSaveDiscarded("h"));
      const app = applied(failed, actions.failedSaveDiscarded("h"), openHund);
      expect(failedIds(applied(app, buttonOf(toast, "Undo")))).toEqual([]);
    });
  });

  it("keeps a failed save waiting to open when its Retry fails", () => {
    const app = applied(
      hundFailed(),
      actions.failedSaveOpened("h", "p1", "m1"),
      actions.failedSaveRetried("h"),
    );
    const [retry] = selectRequestIds(app, "h");
    if (!retry) throw new Error("No Retry was sent.");
    const failed = applied(app, settle(app, retry, failure(500)));
    expect(selectFailedSaves(failed)[0]?.isOpening).toBe(true);
  });
});
