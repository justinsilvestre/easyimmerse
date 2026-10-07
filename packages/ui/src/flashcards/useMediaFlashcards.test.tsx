import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { FlashcardDraft } from "@easyimmerse/types";
import { act, cleanup, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import {
  saveLookupWaitMs,
  saveRequestLimitMs,
} from "../lookup/lookupTiming.ts";
import { createNoticeStore } from "../notices/noticeStore.ts";
import { AppStoreProviders } from "../testSupport/AppStoreProviders.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../testSupport/createTestAppStore.ts";
import { fixtureResponses } from "../testSupport/fixtureResponses.ts";
import { savedFlashcard } from "../testSupport/renderMediaScreen.tsx";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { createSharedSaving } from "./sharedSaving.ts";
import { useUnsavedCardActions } from "./unsaved/useUnsavedCardActions.ts";
import { useMediaFlashcards } from "./useMediaFlashcards.ts";

// Unmounting saves any card still waiting for its lookup after a delay,
// so timers stay fake until the hook has unmounted.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  resetBackend();
});

/** Lets every request and promise already under way run, without waiting on the clock. */
const flushPendingWork = () =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

/** A lookup that answers when the test says so. */
function createLateLookup() {
  let answer: (fields: LookupFlashcardFields | null) => void = () => undefined;
  const fields = new Promise<LookupFlashcardFields | null>((resolve) => {
    answer = resolve;
  });
  return {
    fields,
    answer: (found: LookupFlashcardFields | null) => act(() => answer(found)),
  };
}

const lookedUp: LookupFlashcardFields = {
  word: "Hündchen",
  word_pronunciation: "",
  l1_definition: "puppy",
  l2_definition: "",
};

const typeWord = (word: string) =>
  ({ type: "textChanged", key: "word", value: word }) as const;

type SentFlashcard = {
  id?: string;
  draft?: FlashcardDraft;
} & Partial<FlashcardDraft>;

/** The content a save request sent, whether it created a flashcard or replaced one. */
const sentContent = (request: BackendRequest | undefined) => {
  const sent = request?.body?.value as SentFlashcard | undefined;
  return (sent?.draft ?? sent)?.content;
};

/** The word a save request sent. */
const sentWord = (request: BackendRequest | undefined) =>
  sentContent(request)?.word;

/** The id a request that creates a flashcard sent. */
const sentId = (request: BackendRequest | undefined) =>
  (request?.body?.value as SentFlashcard | undefined)?.id;

function createDraft(word: string): FlashcardDraft {
  return {
    media_file_id: "m1",
    cue_index: 1,
    content: { ...exampleFlashcard, word },
    included_fields: ["word"],
  };
}

/** The text of the status line that counts the flashcards not saved. */
const unsavedCountText = () =>
  screen
    .getByRole("region", { name: "Notifications" })
    .querySelector("p[aria-live]")?.textContent;

/** A backend that answers flashcard saves with success or, when `savesFail`, with failure. */
type SaveOutcome = "succeed" | "fail" | "reject";

function createFlashcardBackend(outcome: SaveOutcome) {
  const saveAnswer = {
    succeed: savedFlashcard,
    fail: fakeFailure({ status: 500, message: "The disk is full" }),
    reject: fakeFailure({ status: 422, message: "The word is too long" }),
  }[outcome];
  return createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/flashcards": { flashcards: [savedFlashcard] },
    "POST /projects/p1/flashcards": saveAnswer,
    "PUT /projects/p1/flashcards/f1": saveAnswer,
    "DELETE /projects/p1/flashcards/f1": undefined,
  });
}

/**
 * Renders the hook over a backend whose flashcard saves wait until the test lets them through,
 * and then succeed, or, while `savesFail`, fail, or, while `savesRejected`, are refused.
 */
function renderFlashcards({ savesFail = false, savesRejected = false } = {}) {
  const outcome: SaveOutcome = savesRejected
    ? "reject"
    : savesFail
      ? "fail"
      : "succeed";
  let backend = createFlashcardBackend(outcome);
  const requests: BackendRequest[] = [];
  const held: (() => void)[] = [];
  const holdingClient = {
    send: async <T,>(request: BackendRequest) => {
      if (request.method === "POST" || request.method === "PUT")
        await new Promise<void>((resolve) => held.push(resolve));
      requests.push(request);
      return backend.send<T>(request);
    },
  };
  const { store, playerRegistry, effects } = createTestAppStore(holdingClient);
  const noticeStore = createNoticeStore();
  const sharedSaving = createSharedSaving();
  const unsavedCardStore = sharedSaving.unsavedCards;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      noticeStore={noticeStore}
      sharedSaving={sharedSaving}
    >
      {children}
    </AppStoreProviders>
  );
  const renderScreen = () =>
    renderHook(
      () => ({
        ...useMediaFlashcards("p1", "m1", false),
        unsavedCardActions: useUnsavedCardActions(),
      }),
      { wrapper },
    );
  const rendered = renderScreen();
  const posts = () => requests.filter((request) => request.method === "POST");
  const puts = () => requests.filter((request) => request.method === "PUT");
  /** Makes the saves let through from now on succeed. */
  const letSavesSucceed = () => {
    backend = createFlashcardBackend("succeed");
  };
  /** The words of the flashcards listed as not saved. */
  const unsavedWords = () =>
    unsavedCardStore.list().map((listed) => listed.card.editor.content.word);
  /** Retries, opens or discards the listed unsaved flashcard for `word`, as its buttons in the status line do. */
  const actOnUnsaved = (word: string, action: "retry" | "open" | "discard") =>
    act(() => {
      const listed = unsavedCardStore
        .list()
        .find((unsaved) => unsaved.card.editor.content.word === word);
      if (listed)
        rendered.result.current.unsavedCardActions[action](listed.flashcardId);
    });
  /** Lets the save held at `index` reach the backend, leaving the others held. */
  const letSaveThrough = (index: number) =>
    act(async () => {
      held.splice(index, 1)[0]?.();
    });
  /** Chooses an action of the latest notice whose message starts with `message`. */
  const chooseFor = (message: string, label: string) =>
    act(() =>
      noticeStore
        .list()
        .findLast((notice) => notice.message.startsWith(message))
        ?.actions?.find((action) => action.label === label)
        ?.onSelect(),
    );
  /** Dismisses the latest notice as the user would. */
  const dismissNotice = () =>
    act(() => {
      const latest = noticeStore.list().at(-1);
      if (latest) noticeStore.dismissByUser(latest.id);
    });
  /** Lets every save sent so far reach the backend. */
  const letSavesThrough = () =>
    act(async () => {
      for (const resolve of held.splice(0)) resolve();
    });
  const notifications = () =>
    effects.calls.flatMap((call) =>
      call.type === "showNotification" ? [call.message] : [],
    );
  /** The app's notices, each as its message followed by its actions' labels. */
  const notices = () =>
    noticeStore
      .list()
      .map((notice) => [
        notice.message,
        ...(notice.actions ?? []).map((action) => action.label),
      ]);
  /** Chooses an action of the latest notice that offers it. */
  const choose = (label: string) =>
    act(() =>
      noticeStore
        .list()
        .flatMap((notice) => notice.actions ?? [])
        .findLast((action) => action.label === label)
        ?.onSelect(),
    );
  const deletes = () =>
    requests.filter((request) => request.method === "DELETE");
  return {
    ...rendered,
    held,
    posts,
    puts,
    deletes,
    letSavesThrough,
    letSavesSucceed,
    notifications,
    notices,
    choose,
    chooseFor,
    letSaveThrough,
    dismissNotice,
    effects,
    unsavedWords,
    unsavedCards: () => unsavedCardStore.list(),
    actOnUnsaved,
    renderScreen,
  };
}

describe("useMediaFlashcards", () => {
  it("sends one save however often Save is pressed while it is under way", async () => {
    const { result, held, letSavesThrough, posts } = renderFlashcards();
    act(() => result.current.start(createDraft("Hund")));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    act(() => result.current.save());
    await letSavesThrough();
    expect(posts()).toHaveLength(1);
  });

  it("sends a save again after one has failed", async () => {
    const { result, held, letSavesThrough, posts } = renderFlashcards({
      savesFail: true,
    });
    act(() => result.current.start(createDraft("Hund")));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    await vi.waitFor(() =>
      expect(result.current.edited?.stage).toBe("editing"),
    );
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    expect(posts()).toHaveLength(2);
  });

  it("leaves open a card started while an earlier one was being saved", async () => {
    const { result, held, letSavesThrough } = renderFlashcards();
    act(() => result.current.start(createDraft("Hund")));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    act(() => result.current.start(createDraft("Katze")));
    await letSavesThrough();
    expect(result.current.edited?.editor.content.word).toBe("Katze");
  });

  it("lets a waiting save go when the late lookup rejects", async () => {
    const { result, held } = renderFlashcards();
    const lateFields = Promise.reject<LookupFlashcardFields | null>(
      new Error("The lookup broke"),
    );
    act(() => result.current.start(createDraft("Hund"), lateFields));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
  });

  describe("when another card is started while a save waits for its lookup", () => {
    async function startAnotherWhileWaiting() {
      const rendered = renderFlashcards();
      const lookup = createLateLookup();
      act(() =>
        rendered.result.current.start(createDraft("Hund"), lookup.fields),
      );
      act(() => rendered.result.current.save());
      act(() => rendered.result.current.start(createDraft("Katze")));
      return { ...rendered, lookup };
    }

    it("keeps waiting for the lookup in the background", async () => {
      const { held } = await startAnotherWhileWaiting();
      await flushPendingWork();
      expect(held).toHaveLength(0);
    });

    it("saves the card filled from the lookup once it answers", async () => {
      const { held, letSavesThrough, posts, lookup } =
        await startAnotherWhileWaiting();
      await lookup.answer(lookedUp);
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentWord(posts()[0])).toBe("Hündchen");
    });

    it("says nothing once the waiting card is saved, since Save was pressed", async () => {
      const { held, letSavesThrough, lookup, notices } =
        await startAnotherWhileWaiting();
      await lookup.answer(lookedUp);
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(notices()).toEqual([]);
    });

    it("keeps the new card open once the waiting card is saved", async () => {
      const { result, held, letSavesThrough, lookup } =
        await startAnotherWhileWaiting();
      await lookup.answer(lookedUp);
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(result.current.edited?.editor.content.word).toBe("Katze");
    });
  });

  describe("when a waiting card's lookup never settles after the card has left the editor", () => {
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] }),
    );

    it("saves the card as it is once the limit from pressing Save has passed", async () => {
      const { result, held } = renderFlashcards();
      const never = new Promise<LookupFlashcardFields | null>(() => undefined);
      act(() => result.current.start(createDraft("Hund"), never));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(4000));
      act(() => result.current.start(createDraft("Katze")));
      await act(() => vi.advanceTimersByTimeAsync(saveLookupWaitMs - 4000));
      expect(held).toHaveLength(1);
    });

    it("keeps waiting short of that limit", async () => {
      const { result, held } = renderFlashcards();
      const never = new Promise<LookupFlashcardFields | null>(() => undefined);
      act(() => result.current.start(createDraft("Hund"), never));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(4000));
      act(() => result.current.start(createDraft("Katze")));
      await act(() => vi.advanceTimersByTimeAsync(saveLookupWaitMs - 4100));
      expect(held).toHaveLength(0);
    });
  });

  describe("when a save fails after its card has left the editor", () => {
    async function failOffScreen() {
      const rendered = renderFlashcards({ savesFail: true });
      const { result, held, letSavesThrough } = rendered;
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() => expect(rendered.unsavedWords()).toHaveLength(1));
      return rendered;
    }

    /** Retries the listed card for “Hündin” and lets the retry through. */
    async function retryHündin(rendered: ReturnType<typeof renderFlashcards>) {
      rendered.actOnUnsaved("Hündin", "retry");
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await flushPendingWork();
    }

    it("lists the card among the flashcards not saved", async () => {
      const { unsavedWords } = await failOffScreen();
      expect(unsavedWords()).toEqual(["Hündin"]);
    });

    it("draws the card on the waveform, though it was never saved", async () => {
      const rendered = await failOffScreen();
      const [listed] = rendered.unsavedCards();
      expect(
        rendered.result.current.segments.map((segment) => segment.id),
      ).toContain(listed?.flashcardId);
    });

    it("gives the card no notice of its own, since a retry may still succeed", async () => {
      const { notices } = await failOffScreen();
      expect(notices()).toEqual([]);
    });

    it("sends nothing again until a retry is asked for", async () => {
      const { held } = await failOffScreen();
      await flushPendingWork();
      expect(held).toHaveLength(0);
    });

    it("sends the card again on Retry", async () => {
      const rendered = await failOffScreen();
      await retryHündin(rendered);
      expect(sentWord(rendered.posts()[1])).toBe("Hündin");
    });

    it("keeps the card listed when the retry fails too", async () => {
      const rendered = await failOffScreen();
      await retryHündin(rendered);
      expect(rendered.unsavedWords()).toEqual(["Hündin"]);
    });

    it("takes the card off the list once a retry succeeds", async () => {
      const rendered = await failOffScreen();
      rendered.letSavesSucceed();
      await retryHündin(rendered);
      expect(rendered.unsavedWords()).toEqual([]);
    });

    it("creates the card under an id it chose, of 32 lowercase hexadecimal digits", async () => {
      const { posts } = await failOffScreen();
      expect(sentId(posts()[0])).toMatch(/^[0-9a-f]{32}$/);
    });

    it("sends the card again on Retry under the id of its first try, so that it cannot be created twice", async () => {
      const rendered = await failOffScreen();
      await retryHündin(rendered);
      expect(sentId(rendered.posts()[1])).toBe(sentId(rendered.posts()[0]));
    });

    it("saves an opened card under the id of its first try", async () => {
      const { result, held, letSavesThrough, posts, actOnUnsaved } =
        await failOffScreen();
      actOnUnsaved("Hündin", "open");
      act(() => result.current.save());
      // The untouched card the opened one replaces is saved in the background too.
      await vi.waitFor(() => expect(held).toHaveLength(2));
      await letSavesThrough();
      const [first, again] = posts().filter(
        (request) => sentWord(request) === "Hündin",
      );
      expect(sentId(again)).toBe(sentId(first));
    });

    it("puts the card back in the editor with its edits on Open", async () => {
      const { result, actOnUnsaved } = await failOffScreen();
      actOnUnsaved("Hündin", "open");
      expect(result.current.edited?.editor.content.word).toBe("Hündin");
    });

    it("takes the card off the list on Open", async () => {
      const { actOnUnsaved, unsavedWords } = await failOffScreen();
      actOnUnsaved("Hündin", "open");
      expect(unsavedWords()).toEqual([]);
    });

    it("saves the card open in the editor when another is opened", async () => {
      const { result, held, letSavesThrough, posts, actOnUnsaved } =
        await failOffScreen();
      act(() => result.current.edit(typeWord("Kater")));
      actOnUnsaved("Hündin", "open");
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentWord(posts()[1])).toBe("Kater");
    });

    const guardCalls = (
      effects: ReturnType<typeof renderFlashcards>["effects"],
    ) => effects.calls.filter((call) => call.type === "guardClose");

    it("keeps the close guard up while the card is listed", async () => {
      const { effects } = await failOffScreen();
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("lifts the close guard once a retry succeeds", async () => {
      const rendered = await failOffScreen();
      rendered.letSavesSucceed();
      await retryHündin(rendered);
      expect(guardCalls(rendered.effects).at(-1)).toEqual({
        type: "guardClose",
        isActive: false,
      });
    });

    describe("on Discard", () => {
      async function discardHündin() {
        const rendered = await failOffScreen();
        rendered.actOnUnsaved("Hündin", "discard");
        return rendered;
      }

      it("takes the card off the list", async () => {
        const { unsavedWords } = await discardHündin();
        expect(unsavedWords()).toEqual([]);
      });

      it("lifts the close guard", async () => {
        const { effects } = await discardHündin();
        expect(guardCalls(effects).at(-1)).toEqual({
          type: "guardClose",
          isActive: false,
        });
      });

      it("offers Undo", async () => {
        const { notices } = await discardHündin();
        expect(notices()).toEqual([
          ["Discarded your changes to the flashcard for “Hündin”.", "Undo"],
        ]);
      });

      it("lists the card again on Undo", async () => {
        const { choose, unsavedWords } = await discardHündin();
        choose("Undo");
        expect(unsavedWords()).toEqual(["Hündin"]);
      });
    });

    describe("once the screen has closed", () => {
      async function failAndClose() {
        const rendered = await failOffScreen();
        rendered.unmount();
        return rendered;
      }

      it("keeps the card listed", async () => {
        const { unsavedWords } = await failAndClose();
        expect(unsavedWords()).toEqual(["Hündin"]);
      });

      it("still sends the card again on Retry", async () => {
        const rendered = await failAndClose();
        rendered.actOnUnsaved("Hündin", "retry");
        // The untouched card that was open when the screen closed is saved in the background too.
        await vi.waitFor(() => expect(rendered.held).toHaveLength(2));
        await rendered.letSavesThrough();
        expect(
          rendered.posts().filter((request) => sentWord(request) === "Hündin"),
        ).toHaveLength(2);
      });

      it("opens the card on Open once its screen shows again", async () => {
        const { actOnUnsaved, renderScreen } = await failAndClose();
        actOnUnsaved("Hündin", "open");
        const { result } = renderScreen();
        expect(result.current.edited?.editor.content.word).toBe("Hündin");
      });

      it("keeps the card listed on Open until its screen shows", async () => {
        const { actOnUnsaved, unsavedWords } = await failAndClose();
        actOnUnsaved("Hündin", "open");
        expect(unsavedWords()).toEqual(["Hündin"]);
      });

      it("keeps the close guard up on Open until its screen shows", async () => {
        const { actOnUnsaved, effects } = await failAndClose();
        actOnUnsaved("Hündin", "open");
        expect(guardCalls(effects).at(-1)).toEqual({
          type: "guardClose",
          isActive: true,
        });
      });
    });

    it("offers Undo once an opened card is closed without saving, even one never changed", async () => {
      const rendered = renderFlashcards({ savesFail: true });
      const { result, held, letSavesThrough } = rendered;
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() => expect(rendered.unsavedWords()).toEqual(["Hund"]));
      rendered.actOnUnsaved("Hund", "open");
      act(() => result.current.close());
      expect(rendered.notices()).toContainEqual([
        "Discarded your changes to the flashcard for “Hund”.",
        "Undo",
      ]);
    });

    it("lists a card whose save fails after the screen has closed", async () => {
      const rendered = renderFlashcards({ savesFail: true });
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.edit(typeWord("Hündin")));
      rendered.unmount();
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.unsavedWords()).toEqual(["Hündin"]),
      );
    });
  });

  describe("when the server refuses the save of a card that has left the editor", () => {
    async function rejectOffScreen() {
      const rendered = renderFlashcards({ savesRejected: true });
      const { result, held, letSavesThrough } = rendered;
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() => expect(rendered.unsavedWords()).toHaveLength(1));
      return rendered;
    }

    it("gives the card a notice of its own, with Open and Discard but no Retry", async () => {
      const { notices } = await rejectOffScreen();
      expect(notices()).toEqual([
        ["The server refused the flashcard for “Hündin”.", "Open", "Discard"],
      ]);
    });

    it("lists the card as refused", async () => {
      const { unsavedWords } = await rejectOffScreen();
      expect(unsavedWords()).toEqual(["Hündin"]);
    });

    it("shows no count of flashcards not saved beside its notice", async () => {
      await rejectOffScreen();
      expect(unsavedCountText()).toBe("");
    });

    it("counts the card among the flashcards not saved once its notice is dismissed", async () => {
      const { dismissNotice } = await rejectOffScreen();
      dismissNotice();
      expect(unsavedCountText()).toBe("1 flashcard not saved");
    });

    it("keeps the card listed once its notice is dismissed", async () => {
      const { dismissNotice, unsavedWords } = await rejectOffScreen();
      dismissNotice();
      expect(unsavedWords()).toEqual(["Hündin"]);
    });

    it("opens the card from its notice", async () => {
      const { result, choose } = await rejectOffScreen();
      choose("Open");
      expect(result.current.edited?.editor.content.word).toBe("Hündin");
    });

    it("withdraws its notice once the card is discarded from the list", async () => {
      const { actOnUnsaved, notices } = await rejectOffScreen();
      actOnUnsaved("Hündin", "discard");
      expect(notices()).toEqual([
        ["Discarded your changes to the flashcard for “Hündin”.", "Undo"],
      ]);
    });

    it("offers no Open on the notice of a card without a media file", async () => {
      const rendered = renderFlashcards({ savesRejected: true });
      const { result, held, letSavesThrough } = rendered;
      act(() =>
        result.current.start({ ...createDraft("Hund"), media_file_id: null }),
      );
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.notices()).toEqual([
          ["The server refused the flashcard for “Hund”.", "Discard"],
        ]),
      );
    });
  });

  describe("when the background save of a saved card fails", () => {
    /** Opens f1, changes its word to “Hündin” and moves on, so that its save fails and it is listed. */
    async function failSavedCard() {
      const rendered = renderFlashcards({ savesFail: true });
      const { result, held, letSavesThrough } = rendered;
      await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.unsavedWords()).toEqual(["Hündin"]),
      );
      return rendered;
    }

    it("opens the listed card with its edits when the flashcard is opened from the screen", async () => {
      const { result } = await failSavedCard();
      act(() => result.current.open(savedFlashcard.id));
      expect(result.current.edited?.editor.content.word).toBe("Hündin");
    });

    it("takes the card off the list once it is opened from the screen", async () => {
      const { result, unsavedWords } = await failSavedCard();
      act(() => result.current.open(savedFlashcard.id));
      expect(unsavedWords()).toEqual([]);
    });

    describe("while a Retry is under way", () => {
      async function retryHündin() {
        const rendered = await failSavedCard();
        rendered.actOnUnsaved("Hündin", "retry");
        await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
        return rendered;
      }

      it("opens the card at once with the content being sent", async () => {
        const { result } = await retryHündin();
        act(() => result.current.open(savedFlashcard.id));
        expect(result.current.edited?.editor.content.word).toBe("Hündin");
      });

      it("takes the card off the list once it opens", async () => {
        const { result, unsavedWords } = await retryHündin();
        act(() => result.current.open(savedFlashcard.id));
        expect(unsavedWords()).toEqual([]);
      });

      it("leaves an opened card to the editor when the Retry fails", async () => {
        const rendered = await retryHündin();
        act(() => rendered.result.current.open(savedFlashcard.id));
        await rendered.letSavesThrough();
        await flushPendingWork();
        expect(rendered.unsavedWords()).toEqual([]);
      });

      it("keeps the editor open on an opened card when the Retry succeeds", async () => {
        const rendered = await retryHündin();
        act(() => rendered.result.current.open(savedFlashcard.id));
        rendered.letSavesSucceed();
        await rendered.letSavesThrough();
        await flushPendingWork();
        expect(rendered.result.current.edited?.editor.content.word).toBe(
          "Hündin",
        );
      });

      it("takes the Retry back once the opened card is closed without saving", async () => {
        const rendered = await retryHündin();
        act(() => rendered.result.current.open(savedFlashcard.id));
        act(() => rendered.result.current.close());
        rendered.letSavesSucceed();
        await vi.waitFor(async () => {
          await rendered.letSavesThrough();
          expect(rendered.puts()).toHaveLength(3);
        });
        expect(sentWord(rendered.puts()[2])).toBe(savedFlashcard.content.word);
      });
    });

    it("drops a Retry that waited behind a newer save from the form, which took the card off the list", async () => {
      const rendered = renderFlashcards({ savesFail: true });
      const { result, held, letSavesThrough, puts } = rendered;
      await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.open(savedFlashcard.id));
      act(() => result.current.edit(typeWord("Rüde")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.unsavedWords()).toEqual(["Hündin"]),
      );
      rendered.letSavesSucceed();
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      rendered.actOnUnsaved("Hündin", "retry");
      await letSavesThrough();
      await flushPendingWork();
      await letSavesThrough();
      await flushPendingWork();
      expect(puts().map(sentWord)).toEqual(["Hündin", "Rüde"]);
    });
  });

  it("takes a listed card off the list once a later save of it from the screen succeeds", async () => {
    const rendered = renderFlashcards({ savesFail: true });
    const { result, held, letSavesThrough } = rendered;
    await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
    act(() => result.current.open(savedFlashcard.id));
    act(() => result.current.edit(typeWord("Hündin")));
    act(() => result.current.open(savedFlashcard.id));
    act(() => result.current.edit(typeWord("Rüde")));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    await vi.waitFor(() => expect(rendered.unsavedWords()).toEqual(["Hündin"]));
    rendered.letSavesSucceed();
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    await vi.waitFor(() => expect(rendered.unsavedWords()).toEqual([]));
  });

  describe("when a save finishes after its card has left the screen", () => {
    async function leaveWhileSending(setup: { savesFail?: boolean } = {}) {
      const rendered = renderFlashcards(setup);
      const { result, held, letSavesThrough } = rendered;
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      act(() => result.current.start(createDraft("Katze")));
      await letSavesThrough();
      return rendered;
    }

    it("says nothing of its success", async () => {
      const { notices, posts } = await leaveWhileSending();
      await vi.waitFor(() => expect(posts()).toHaveLength(1));
      await flushPendingWork();
      expect(notices()).toEqual([]);
    });

    it("lists the card among the flashcards not saved when it fails", async () => {
      const { unsavedWords } = await leaveWhileSending({ savesFail: true });
      await vi.waitFor(() => expect(unsavedWords()).toEqual(["Hund"]));
    });
  });

  describe("when a save asked for in the editor lands", () => {
    async function saveHund() {
      const rendered = renderFlashcards();
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.save());
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await vi.waitFor(() => expect(rendered.notices()).toHaveLength(1));
      return rendered;
    }

    it("shows the brief notice with Undo that a card saved in the background shows", async () => {
      const { notices } = await saveHund();
      expect(notices()).toEqual([["Saved the flashcard for “Hund”.", "Undo"]]);
    });

    it("closes the card", async () => {
      const { result } = await saveHund();
      expect(result.current.edited).toBeNull();
    });

    it("deletes a new card on Undo", async () => {
      const { choose, deletes } = await saveHund();
      choose("Undo");
      await vi.waitFor(() => expect(deletes()).toHaveLength(1));
    });

    it("puts back a saved card's earlier content on Undo", async () => {
      const rendered = renderFlashcards();
      const { result, held, letSavesThrough, puts } = rendered;
      await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() => expect(rendered.notices()).toHaveLength(1));
      rendered.choose("Undo");
      await vi.waitFor(async () => {
        await letSavesThrough();
        expect(puts()).toHaveLength(2);
      });
      expect(sentWord(puts()[1])).toBe(savedFlashcard.content.word);
    });
  });

  describe("when a save asked for in the editor fails", () => {
    async function failHund() {
      const rendered = renderFlashcards({ savesFail: true });
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.save());
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.result.current.saveFailed).toBe(true),
      );
      return rendered;
    }

    it("keeps the card open for another try", async () => {
      const { result } = await failHund();
      expect(result.current.edited?.stage).toBe("editing");
    });

    it("keeps telling of the failure once the card is changed", async () => {
      const { result } = await failHund();
      act(() => result.current.edit(typeWord("Hündin")));
      expect(result.current.saveFailed).toBe(true);
    });

    it("stops telling of the failure once Save is pressed again", async () => {
      const { result, held } = await failHund();
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      expect(result.current.saveFailed).toBe(false);
    });

    it("sends no passing notification, since the editor tells of it", async () => {
      const { notifications } = await failHund();
      expect(notifications()).toEqual([]);
    });

    it("lists the card among the flashcards not saved once it is closed", async () => {
      const { result, unsavedWords } = await failHund();
      act(() => result.current.close());
      expect(unsavedWords()).toEqual(["Hund"]);
    });

    it("closes the card once Close is pressed", async () => {
      const { result } = await failHund();
      act(() => result.current.close());
      expect(result.current.edited).toBeNull();
    });

    it("keeps the close guard up while the card stays open", async () => {
      const { effects } = await failHund();
      expect(
        effects.calls.filter((call) => call.type === "guardClose"),
      ).toEqual([{ type: "guardClose", isActive: true }]);
    });

    it("opens the listed card again from the list", async () => {
      const { result, actOnUnsaved } = await failHund();
      act(() => result.current.close());
      actOnUnsaved("Hund", "open");
      await vi.waitFor(() =>
        expect(result.current.edited?.editor.content.word).toBe("Hund"),
      );
    });
  });

  describe("when a saved card is reopened while a save of it is under way", () => {
    async function reopenWhileSaving() {
      const rendered = renderFlashcards();
      const { result, held } = rendered;
      await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() =>
        result.current.edit({
          type: "textChanged",
          key: "word",
          value: "Hündin",
        }),
      );
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() =>
        result.current.edit({
          type: "textChanged",
          key: "word",
          value: "Rüde",
        }),
      );
      return rendered;
    }

    it("keeps the reopened card open once the earlier save returns", async () => {
      const { result, letSavesThrough } = await reopenWhileSaving();
      await letSavesThrough();
      expect(result.current.edited?.editor.content.word).toBe("Rüde");
    });

    it("sends its second save after the first rather than dropping it", async () => {
      const { result, held, letSavesThrough, puts } = await reopenWhileSaving();
      act(() => result.current.save());
      await letSavesThrough();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(puts()).toHaveLength(2);
    });
  });

  it("ignores a retiming of a card not open in the editor, whose handles the waveform does not offer", async () => {
    const { result, held } = renderFlashcards();
    await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
    act(() => result.current.moveClipEndpoint(savedFlashcard.id, "end", 4000));
    await flushPendingWork();
    expect(held).toHaveLength(0);
  });

  it("gives the open card's segment as the one that can be retimed", async () => {
    const { result } = renderFlashcards();
    await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
    act(() => result.current.open(savedFlashcard.id));
    expect(result.current.editedSegmentId).toBe(savedFlashcard.id);
  });

  it("opens nothing for a cue no flashcard was made from", async () => {
    const { result } = renderFlashcards();
    await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
    act(() => result.current.openForCue(7));
    expect(result.current.edited).toBeNull();
  });

  describe("when the user moves on from a card without pressing Save", () => {
    async function moveOnFrom(
      change: (rendered: ReturnType<typeof renderFlashcards>) => void,
    ) {
      const rendered = renderFlashcards();
      change(rendered);
      act(() => rendered.result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await vi.waitFor(() => expect(rendered.notices()).toHaveLength(1));
      return rendered;
    }

    const startChanged = ({ result }: ReturnType<typeof renderFlashcards>) => {
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
    };

    const startUntouched = ({ result }: ReturnType<typeof renderFlashcards>) =>
      act(() => result.current.start(createDraft("Hund")));

    it("saves a changed new card as it is", async () => {
      const { posts } = await moveOnFrom(startChanged);
      expect(sentWord(posts()[0])).toBe("Hündin");
    });

    it("saves an untouched new card too", async () => {
      const { posts } = await moveOnFrom(startUntouched);
      expect(sentWord(posts()[0])).toBe("Hund");
    });

    it("offers Undo in a notice naming the card", async () => {
      const { notices } = await moveOnFrom(startChanged);
      expect(notices()).toEqual([
        ["Saved the flashcard for “Hündin”.", "Undo"],
      ]);
    });

    it("deletes a new card on Undo", async () => {
      const { choose, deletes } = await moveOnFrom(startChanged);
      choose("Undo");
      await vi.waitFor(() => expect(deletes()).toHaveLength(1));
    });

    it("opens the other card at once", () => {
      const { result } = renderFlashcards();
      startChanged({ result } as ReturnType<typeof renderFlashcards>);
      act(() => result.current.start(createDraft("Katze")));
      expect(result.current.edited?.editor.content.word).toBe("Katze");
    });

    describe("from a changed saved card", () => {
      async function moveOnFromSavedCard() {
        const rendered = renderFlashcards();
        const { result } = rendered;
        await vi.waitFor(() =>
          expect(result.current.flashcards).toHaveLength(1),
        );
        act(() => result.current.open(savedFlashcard.id));
        act(() => result.current.edit(typeWord("Hündin")));
        act(() => result.current.start(createDraft("Katze")));
        await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
        await rendered.letSavesThrough();
        await vi.waitFor(() => expect(rendered.notices()).toHaveLength(1));
        return rendered;
      }

      it("saves it as it is", async () => {
        const { puts } = await moveOnFromSavedCard();
        expect(sentWord(puts()[0])).toBe("Hündin");
      });

      it("puts back its earlier content on Undo", async () => {
        const { choose, held, letSavesThrough, puts } =
          await moveOnFromSavedCard();
        choose("Undo");
        await vi.waitFor(() => expect(held).toHaveLength(1));
        await letSavesThrough();
        expect(sentWord(puts()[1])).toBe(savedFlashcard.content.word);
      });

      it("withdraws the Undo once the flashcard is opened in the editor", async () => {
        const { result, notices } = await moveOnFromSavedCard();
        act(() => result.current.open(savedFlashcard.id));
        expect(notices()).toEqual([]);
      });

      it("holds a deletion of the flashcard until its save has settled", async () => {
        const rendered = renderFlashcards();
        const { result, held, deletes } = rendered;
        await vi.waitFor(() =>
          expect(result.current.flashcards).toHaveLength(1),
        );
        act(() => result.current.open(savedFlashcard.id));
        act(() => result.current.edit(typeWord("Hündin")));
        act(() => result.current.start(createDraft("Katze")));
        await vi.waitFor(() => expect(held).toHaveLength(1));
        act(() => result.current.open(savedFlashcard.id));
        act(() => result.current.remove());
        await flushPendingWork();
        expect(deletes()).toHaveLength(0);
      });

      it("holds a later save of the flashcard until its Undo has settled", async () => {
        const { result, choose, held } = await moveOnFromSavedCard();
        choose("Undo");
        await vi.waitFor(() => expect(held).toHaveLength(1));
        // Closes the untouched card the user moved on to, which would otherwise be saved as it leaves.
        act(() => result.current.close());
        act(() => result.current.open(savedFlashcard.id));
        act(() => result.current.edit(typeWord("Rüde")));
        act(() => result.current.save());
        await flushPendingWork();
        expect(held).toHaveLength(1);
      });
    });

    it("withdraws a new card's Undo once the card is opened in the editor", async () => {
      const { result, notices } = await moveOnFrom(startChanged);
      act(() => result.current.open(savedFlashcard.id));
      expect(notices()).toEqual([]);
    });

    describe("when the flashcard is reopened while its save waits behind an earlier one", () => {
      /** Saves f1 as “Hündin”, then, while that save is on its way, as “Hündchen”, which waits in the queue; then reopens f1. */
      async function reopenDuringSaves() {
        const rendered = renderFlashcards();
        const { result, held } = rendered;
        await vi.waitFor(() =>
          expect(result.current.flashcards).toHaveLength(1),
        );
        act(() => result.current.open(savedFlashcard.id));
        act(() => result.current.edit(typeWord("Hündin")));
        act(() => result.current.open(savedFlashcard.id));
        await vi.waitFor(() => expect(held).toHaveLength(1));
        act(() => result.current.edit(typeWord("Hündchen")));
        act(() => result.current.open(savedFlashcard.id));
        return rendered;
      }

      /** Lets saves through until `count` PUTs have reached the backend. */
      const letPutsThrough = async (
        { held, puts }: ReturnType<typeof renderFlashcards>,
        count: number,
      ) =>
        vi.waitFor(async () => {
          for (const resolve of held.splice(0)) resolve();
          await Promise.resolve();
          expect(puts()).toHaveLength(count);
        });

      it("opens it with the content last sent, which the list does not show yet", async () => {
        const { result } = await reopenDuringSaves();
        expect(result.current.edited?.editor.content.word).toBe("Hündchen");
      });

      it("puts back the content from before a later save on its Undo", async () => {
        const rendered = await reopenDuringSaves();
        const { result, puts, chooseFor } = rendered;
        act(() => result.current.edit(typeWord("Welpe")));
        act(() => result.current.start(createDraft("Katze")));
        await letPutsThrough(rendered, 3);
        await vi.waitFor(() =>
          expect(rendered.notices().flat()).toContain(
            "Saved the flashcard for “Welpe”.",
          ),
        );
        chooseFor("Saved the flashcard for “Welpe”", "Undo");
        await letPutsThrough(rendered, 4);
        expect(sentWord(puts().at(-1))).toBe("Hündchen");
      });
    });

    it("leaves an unchanged saved card as it is", async () => {
      const { result, held } = renderFlashcards();
      await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() => result.current.start(createDraft("Katze")));
      await flushPendingWork();
      expect(held).toHaveLength(0);
    });

    it("saves a card as it is when the screen closes, offering Undo", async () => {
      const rendered = renderFlashcards();
      startChanged(rendered);
      rendered.unmount();
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.notices()).toEqual([
          ["Saved the flashcard for “Hündin”.", "Undo"],
        ]),
      );
    });
  });

  describe("when Close without saving is pressed", () => {
    function closeChanged() {
      const rendered = renderFlashcards();
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.edit(typeWord("Hündin")));
      act(() => rendered.result.current.close());
      return rendered;
    }

    it("discards a changed card at once", () => {
      const { result } = closeChanged();
      expect(result.current.edited).toBeNull();
    });

    it("offers Undo in a notice naming the card", () => {
      const { notices } = closeChanged();
      expect(notices()).toEqual([
        ["Discarded your changes to the flashcard for “Hündin”.", "Undo"],
      ]);
    });

    it("reopens the card with its edits on Undo", () => {
      const { result, choose } = closeChanged();
      choose("Undo");
      expect(result.current.edited?.editor.content.word).toBe("Hündin");
    });

    it("saves nothing", async () => {
      const { held } = closeChanged();
      await flushPendingWork();
      expect(held).toHaveLength(0);
    });

    it("closes an untouched card without a notice", () => {
      const { result, notices } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.close());
      expect(notices()).toEqual([]);
    });

    it("withdraws the Undo once the screen closes", () => {
      const { unmount, notices } = closeChanged();
      unmount();
      expect(notices()).toEqual([]);
    });
  });

  describe("while work would be lost by closing the app", () => {
    const guardCalls = (
      effects: ReturnType<typeof renderFlashcards>["effects"],
    ) => effects.calls.filter((call) => call.type === "guardClose");

    it("guards the app against closing", async () => {
      const { result, held, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("guards the app against closing while a save waits for definitions", () => {
      const { result, effects } = renderFlashcards();
      const lookup = createLateLookup();
      act(() => result.current.start(createDraft("Hund"), lookup.fields));
      act(() => result.current.save());
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("keeps the guard up while a waiting card leaves the screen", () => {
      const { result, effects, unmount } = renderFlashcards();
      const lookup = createLateLookup();
      act(() => result.current.start(createDraft("Hund"), lookup.fields));
      act(() => result.current.save());
      unmount();
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("guards the app against closing while the open card has unsaved changes", () => {
      const { result, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("lifts the guard once unsaved changes are discarded", () => {
      const { result, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.close());
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
        { type: "guardClose", isActive: false },
      ]);
    });

    it("keeps the guard up while a changed card leaves to be saved", () => {
      const { result, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("lifts the guard once the save has settled", async () => {
      const { result, held, letSavesThrough, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(guardCalls(effects)).toEqual([
          { type: "guardClose", isActive: true },
          { type: "guardClose", isActive: false },
        ]),
      );
    });
  });

  describe("when a save request never settles", () => {
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }),
    );

    async function hangSave() {
      const rendered = renderFlashcards();
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.edit(typeWord("Hündin")));
      act(() => rendered.result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
      return rendered;
    }

    describe("and the card is then discarded, since the save may have landed after all", () => {
      async function hangBackgroundSave() {
        const rendered = renderFlashcards();
        act(() => rendered.result.current.start(createDraft("Hund")));
        act(() => rendered.result.current.edit(typeWord("Hündin")));
        act(() => rendered.result.current.start(createDraft("Katze")));
        await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
        return rendered;
      }

      it("deletes a new card once it is discarded", async () => {
        const { actOnUnsaved, deletes } = await hangBackgroundSave();
        actOnUnsaved("Hündin", "discard");
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(deletes()).toHaveLength(1);
      });

      it("deletes nothing when the save was refused rather than unanswered", async () => {
        const rendered = renderFlashcards({ savesFail: true });
        act(() => rendered.result.current.start(createDraft("Hund")));
        act(() => rendered.result.current.edit(typeWord("Hündin")));
        act(() => rendered.result.current.start(createDraft("Katze")));
        await act(() => vi.advanceTimersByTimeAsync(0));
        await rendered.letSavesThrough();
        await act(() => vi.advanceTimersByTimeAsync(0));
        rendered.actOnUnsaved("Hündin", "discard");
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(rendered.deletes()).toHaveLength(0);
      });

      it("puts back a saved card's earlier content once it is closed and then discarded from the list", async () => {
        const rendered = renderFlashcards();
        const { result } = rendered;
        await act(() => vi.advanceTimersByTimeAsync(0));
        act(() => result.current.open(savedFlashcard.id));
        act(() => result.current.edit(typeWord("Hündin")));
        act(() => result.current.save());
        await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
        act(() => result.current.close());
        rendered.actOnUnsaved("Hündin", "discard");
        await act(() => vi.advanceTimersByTimeAsync(0));
        await rendered.letSavesThrough();
        await act(() => vi.advanceTimersByTimeAsync(0));
        expect(sentWord(rendered.puts().at(-1))).toBe(
          savedFlashcard.content.word,
        );
      });
    });

    it("tells that the save failed once its limit has passed", async () => {
      const { result } = await hangSave();
      expect(result.current.saveFailed).toBe(true);
    });

    it("keeps the edits open for another try", async () => {
      const { result } = await hangSave();
      expect(result.current.edited?.stage).toBe("editing");
    });

    it("keeps the close guard up once the card is closed and listed as not saved", async () => {
      const { result, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
      act(() => result.current.close());
      expect(
        effects.calls.filter((call) => call.type === "guardClose").at(-1),
      ).toEqual({ type: "guardClose", isActive: true });
    });

    it("says nothing short of its limit", async () => {
      const { result } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs - 100));
      expect(result.current.saveFailed).toBe(false);
    });

    it("lists the card among the flashcards not saved when it has left the editor", async () => {
      const { result, unsavedWords } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
      expect(unsavedWords()).toEqual(["Hündin"]);
    });
  });

  describe("when the lookup never settles", () => {
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }),
    );

    it("saves the card as it is once the save has waited its limit", async () => {
      const { result, held } = renderFlashcards();
      const never = new Promise<LookupFlashcardFields | null>(() => undefined);
      act(() => result.current.start(createDraft("Hund"), never));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveLookupWaitMs));
      expect(held).toHaveLength(1);
    });

    it("keeps waiting short of its limit", async () => {
      const { result, held } = renderFlashcards();
      const never = new Promise<LookupFlashcardFields | null>(() => undefined);
      act(() => result.current.start(createDraft("Hund"), never));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveLookupWaitMs - 100));
      expect(held).toHaveLength(0);
    });
  });
});
