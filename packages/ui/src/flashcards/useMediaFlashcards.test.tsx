import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { FlashcardDraft } from "@easyimmerse/types";
import { act, cleanup, renderHook } from "@testing-library/react";
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
import { useMediaFlashcards } from "./useMediaFlashcards.ts";

afterEach(() => {
  cleanup();
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

/** The word a save request sent, whether it created a flashcard or replaced one. */
const sentWord = (request: BackendRequest | undefined) => {
  const sent = request?.body?.value as SentFlashcard | undefined;
  return (sent?.draft ?? sent)?.content?.word;
};

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

/** A backend that answers flashcard saves with success or, when `savesFail`, with failure. */
function createFlashcardBackend(savesFail: boolean) {
  const saveAnswer = savesFail
    ? fakeFailure({ status: 500, message: "The disk is full" })
    : savedFlashcard;
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
 * and then succeed or, while `savesFail`, fail.
 */
function renderFlashcards({ savesFail = false } = {}) {
  const backends = {
    failing: createFlashcardBackend(true),
    succeeding: createFlashcardBackend(false),
  };
  let backend = savesFail ? backends.failing : backends.succeeding;
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
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      noticeStore={noticeStore}
    >
      {children}
    </AppStoreProviders>
  );
  const rendered = renderHook(() => useMediaFlashcards("p1", "m1", false), {
    wrapper,
  });
  const posts = () => requests.filter((request) => request.method === "POST");
  const puts = () => requests.filter((request) => request.method === "PUT");
  /** Makes the saves let through from now on succeed. */
  const letSavesSucceed = () => {
    backend = backends.succeeding;
  };
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
    dismissNotice,
    effects,
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

    afterEach(() => vi.useRealTimers());

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
      await vi.waitFor(() => expect(rendered.notices()).toHaveLength(1));
      return rendered;
    }

    it("leaves a notice naming the card, with Retry and Reopen", async () => {
      const { notices } = await failOffScreen();
      expect(notices()).toEqual([
        ["Couldn't save the flashcard for “Hündin”.", "Retry", "Reopen"],
      ]);
    });

    it("sends the card again on Retry", async () => {
      const { held, letSavesThrough, posts, choose } = await failOffScreen();
      choose("Retry");
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentWord(posts()[1])).toBe("Hündin");
    });

    it("creates the card under an id it chose, of 32 lowercase hexadecimal digits", async () => {
      const { posts } = await failOffScreen();
      expect(sentId(posts()[0])).toMatch(/^[0-9a-f]{32}$/);
    });

    it("sends the card again on Retry under the id of its first try, so that it cannot be created twice", async () => {
      const { held, letSavesThrough, posts, choose } = await failOffScreen();
      choose("Retry");
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentId(posts()[1])).toBe(sentId(posts()[0]));
    });

    it("saves a reopened card under the id of its first try", async () => {
      const { result, held, letSavesThrough, posts, choose } =
        await failOffScreen();
      choose("Reopen");
      act(() => result.current.save());
      // The untouched card the reopened one replaces is saved in the background too.
      await vi.waitFor(() => expect(held).toHaveLength(2));
      await letSavesThrough();
      const [first, again] = posts().filter(
        (request) => sentWord(request) === "Hündin",
      );
      expect(sentId(again)).toBe(sentId(first));
    });

    it("puts the card back in the editor with its edits on Reopen", async () => {
      const { result, choose } = await failOffScreen();
      choose("Reopen");
      expect(result.current.edited?.editor.content.word).toBe("Hündin");
    });

    it("saves the card open in the editor when another is reopened", async () => {
      const { result, held, letSavesThrough, posts, choose } =
        await failOffScreen();
      act(() => result.current.edit(typeWord("Kater")));
      choose("Reopen");
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentWord(posts()[1])).toBe("Kater");
    });

    const guardCalls = (
      effects: ReturnType<typeof renderFlashcards>["effects"],
    ) => effects.calls.filter((call) => call.type === "guardClose");

    it("keeps the close guard up while the notice holds the edits", async () => {
      const { effects } = await failOffScreen();
      expect(guardCalls(effects)).toEqual([
        { type: "guardClose", isActive: true },
      ]);
    });

    it("lifts the close guard once a retry succeeds", async () => {
      const { choose, held, letSavesSucceed, letSavesThrough, effects } =
        await failOffScreen();
      letSavesSucceed();
      choose("Retry");
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(guardCalls(effects).at(-1)).toEqual({
          type: "guardClose",
          isActive: false,
        }),
      );
    });

    it("lifts the close guard once the notice is dismissed", async () => {
      const { dismissNotice, effects } = await failOffScreen();
      dismissNotice();
      expect(guardCalls(effects).at(-1)).toEqual({
        type: "guardClose",
        isActive: false,
      });
    });

    it("offers Undo once the notice is dismissed, since the edits are discarded", async () => {
      const { dismissNotice, notices } = await failOffScreen();
      dismissNotice();
      expect(notices()).toEqual([
        ["Discarded your changes to the flashcard for “Hündin”.", "Undo"],
      ]);
    });

    it("brings the failure notice back on Undo", async () => {
      const { dismissNotice, choose, notices } = await failOffScreen();
      dismissNotice();
      choose("Undo");
      expect(notices()).toEqual([
        ["Couldn't save the flashcard for “Hündin”.", "Retry", "Reopen"],
      ]);
    });

    it("offers only Retry when the failure comes after the screen has closed", async () => {
      const rendered = renderFlashcards({ savesFail: true });
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.edit(typeWord("Hündin")));
      rendered.unmount();
      await vi.waitFor(() => expect(rendered.held).toHaveLength(1));
      await rendered.letSavesThrough();
      await vi.waitFor(() =>
        expect(rendered.notices()).toEqual([
          ["Couldn't save the flashcard for “Hündin”.", "Retry"],
        ]),
      );
    });

    it("keeps Retry once the screen closes", async () => {
      const { unmount, notices } = await failOffScreen();
      unmount();
      expect(notices()).toEqual([
        ["Couldn't save the flashcard for “Hündin”.", "Retry"],
      ]);
    });
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
      const { result, posts } = await leaveWhileSending();
      await vi.waitFor(() => expect(posts()).toHaveLength(1));
      await flushPendingWork();
      expect(result.current.isSaved).toBe(false);
    });

    it("leaves a failure notice naming the card", async () => {
      const { notices } = await leaveWhileSending({ savesFail: true });
      await vi.waitFor(() =>
        expect(notices()).toEqual([
          ["Couldn't save the flashcard for “Hund”.", "Retry", "Reopen"],
        ]),
      );
    });
  });

  it("still tells of an ordinary save", async () => {
    const { result, held, letSavesThrough } = renderFlashcards();
    act(() => result.current.start(createDraft("Hund")));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    await vi.waitFor(() => expect(result.current.isSaved).toBe(true));
  });

  it("still tells of an ordinary failed save in the editor", async () => {
    const { result, held, letSavesThrough, notifications } = renderFlashcards({
      savesFail: true,
    });
    act(() => result.current.start(createDraft("Hund")));
    act(() => result.current.save());
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    await vi.waitFor(() =>
      expect(notifications()).toEqual(["The flashcard could not be saved"]),
    );
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

      it("withdraws the Undo once a later save of the flashcard starts", async () => {
        const { result, notices } = await moveOnFromSavedCard();
        act(() =>
          result.current.moveClipEndpoint(savedFlashcard.id, "end", 4000),
        );
        expect(notices()).toEqual([]);
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
        act(() =>
          result.current.moveClipEndpoint(savedFlashcard.id, "end", 4000),
        );
        await flushPendingWork();
        expect(held).toHaveLength(1);
      });
    });

    it("withdraws a new card's Undo once the card is opened in the editor", async () => {
      const { result, notices } = await moveOnFrom(startChanged);
      act(() => result.current.open(savedFlashcard.id));
      expect(notices()).toEqual([]);
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

    afterEach(() => vi.useRealTimers());

    async function hangSave() {
      const rendered = renderFlashcards();
      act(() => rendered.result.current.start(createDraft("Hund")));
      act(() => rendered.result.current.edit(typeWord("Hündin")));
      act(() => rendered.result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
      return rendered;
    }

    it("tells that the save failed once its limit has passed", async () => {
      const { notifications } = await hangSave();
      expect(notifications()).toEqual(["The flashcard could not be saved"]);
    });

    it("keeps the edits open for another try", async () => {
      const { result } = await hangSave();
      expect(result.current.edited?.stage).toBe("editing");
    });

    it("lifts the close guard it raised", async () => {
      const { result, effects } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
      expect(
        effects.calls.filter((call) => call.type === "guardClose"),
      ).toEqual([
        { type: "guardClose", isActive: true },
        { type: "guardClose", isActive: false },
      ]);
    });

    it("says nothing short of its limit", async () => {
      const { result, notifications } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.save());
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs - 100));
      expect(notifications()).toEqual([]);
    });

    it("leaves a failure notice with Retry when its card has left the editor", async () => {
      const { result, notices } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await act(() => vi.advanceTimersByTimeAsync(saveRequestLimitMs));
      expect(notices()).toEqual([
        ["Couldn't save the flashcard for “Hündin”.", "Retry", "Reopen"],
      ]);
    });
  });

  describe("when the lookup never settles", () => {
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }),
    );

    afterEach(() => vi.useRealTimers());

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
