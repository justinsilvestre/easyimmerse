import type { BackendRequest } from "@easyimmerse/backend";
import { resetBackend } from "@easyimmerse/backend";
import type { FlashcardDraft } from "@easyimmerse/types";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupFlashcardFields } from "../lookup/flashcardFieldsFromLookup.ts";
import { saveLookupWaitMs } from "../lookup/lookupTiming.ts";
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

function createDraft(word: string): FlashcardDraft {
  return {
    media_file_id: "m1",
    cue_index: 1,
    content: { ...exampleFlashcard, word },
    included_fields: ["word"],
  };
}

/** Renders the hook over a backend whose flashcard saves wait until the test lets them through, and then succeed or fail. */
function renderFlashcards({ savesFail = false } = {}) {
  const client = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/flashcards": { flashcards: [savedFlashcard] },
    "POST /projects/p1/flashcards": savesFail
      ? fakeFailure({ status: 500, message: "The disk is full" })
      : savedFlashcard,
    "PUT /projects/p1/flashcards/f1": savesFail
      ? fakeFailure({ status: 500, message: "The disk is full" })
      : savedFlashcard,
  });
  const held: (() => void)[] = [];
  const holdingClient = {
    send: <T,>(request: BackendRequest) =>
      request.method === "POST" || request.method === "PUT"
        ? new Promise<void>((resolve) => held.push(resolve)).then(() =>
            client.send<T>(request),
          )
        : client.send<T>(request),
  };
  const { store, playerRegistry, effects } = createTestAppStore(holdingClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders store={store} playerRegistry={playerRegistry}>
      {children}
    </AppStoreProviders>
  );
  const rendered = renderHook(() => useMediaFlashcards("p1", "m1", false), {
    wrapper,
  });
  const posts = () =>
    client.requests.filter((request) => request.method === "POST");
  const puts = () =>
    client.requests.filter((request) => request.method === "PUT");
  /** Lets every save sent so far reach the backend. */
  const letSavesThrough = () =>
    act(async () => {
      for (const resolve of held.splice(0)) resolve();
    });
  const notifications = () =>
    effects.calls.flatMap((call) =>
      call.type === "showNotification" ? [call.message] : [],
    );
  return {
    ...rendered,
    held,
    posts,
    puts,
    letSavesThrough,
    notifications,
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
      const never = new Promise<LookupFlashcardFields | null>(() => undefined);
      act(() => rendered.result.current.start(createDraft("Hund"), never));
      act(() => rendered.result.current.save());
      act(() => rendered.result.current.start(createDraft("Katze")));
      return rendered;
    }

    it("saves the waiting card as it is", async () => {
      const { held, letSavesThrough, posts } = await startAnotherWhileWaiting();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(
        (posts()[0]?.body?.value as { content?: { word?: string } })?.content
          ?.word,
      ).toBe("Hund");
    });

    it("says nothing once the waiting card is saved in the background", async () => {
      const { result, held, letSavesThrough } =
        await startAnotherWhileWaiting();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(result.current.isSaved).toBe(false);
    });

    it("keeps the new card open once the waiting card is saved", async () => {
      const { result, held, letSavesThrough } =
        await startAnotherWhileWaiting();
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(result.current.edited?.editor.content.word).toBe("Katze");
    });
  });

  it("names the word of a card that could not be saved in the background", async () => {
    const { result, held, letSavesThrough, notifications } = renderFlashcards({
      savesFail: true,
    });
    const never = new Promise<LookupFlashcardFields | null>(() => undefined);
    act(() => result.current.start(createDraft("Hund"), never));
    act(() => result.current.save());
    act(() => result.current.start(createDraft("Katze")));
    await vi.waitFor(() => expect(held).toHaveLength(1));
    await letSavesThrough();
    await vi.waitFor(() =>
      expect(notifications()).toEqual([
        "Couldn't save the flashcard for “Hund”.",
      ]),
    );
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
      await act(async () => undefined);
      expect(result.current.isSaved).toBe(false);
    });

    it("names the word when it fails", async () => {
      const { notifications } = await leaveWhileSending({ savesFail: true });
      await vi.waitFor(() =>
        expect(notifications()).toEqual([
          "Couldn't save the flashcard for “Hund”.",
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

  it("saves a waiting card as it is when a saved card is opened", async () => {
    const { result, held } = renderFlashcards();
    await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
    const never = new Promise<LookupFlashcardFields | null>(() => undefined);
    act(() => result.current.start(createDraft("Hund"), never));
    act(() => result.current.save());
    act(() => result.current.open(savedFlashcard.id));
    await vi.waitFor(() => expect(held).toHaveLength(1));
  });

  describe("when the screen closes while a save waits for its lookup", () => {
    function closeWhileWaiting(setup: { savesFail?: boolean } = {}) {
      const rendered = renderFlashcards(setup);
      const never = new Promise<LookupFlashcardFields | null>(() => undefined);
      act(() => rendered.result.current.start(createDraft("Hund"), never));
      act(() => rendered.result.current.save());
      rendered.unmount();
      return rendered;
    }

    it("saves the waiting card as it is", async () => {
      const { held } = closeWhileWaiting();
      await vi.waitFor(() => expect(held).toHaveLength(1));
    });

    it("names the word of a card that could not be saved", async () => {
      const { held, letSavesThrough, notifications } = closeWhileWaiting({
        savesFail: true,
      });
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(notifications()).toEqual([
          "Couldn't save the flashcard for “Hund”.",
        ]),
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

  describe("when another card replaces one with unsaved changes", () => {
    const typeWord = (word: string) =>
      ({
        type: "textChanged",
        key: "word",
        value: word,
      }) as const;

    const sentWord = (request: BackendRequest | undefined) =>
      (request?.body?.value as { content?: { word?: string } } | undefined)
        ?.content?.word;

    it("saves a changed new card as it is first", async () => {
      const { result, held, letSavesThrough, posts } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentWord(posts()[0])).toBe("Hündin");
    });

    it("saves a changed saved card as it is first", async () => {
      const { result, held, letSavesThrough, puts } = renderFlashcards();
      await vi.waitFor(() => expect(result.current.flashcards).toHaveLength(1));
      act(() => result.current.open(savedFlashcard.id));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      expect(sentWord(puts()[0])).toBe("Hündin");
    });

    it("opens the other card at once", () => {
      const { result } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      expect(result.current.edited?.editor.content.word).toBe("Katze");
    });

    it("drops an untouched new card without saving it", async () => {
      const { result, held } = renderFlashcards();
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.start(createDraft("Katze")));
      await flushPendingWork();
      expect(held).toHaveLength(0);
    });

    it("names the word of a changed card that could not be saved", async () => {
      const { result, held, letSavesThrough, notifications } = renderFlashcards(
        {
          savesFail: true,
        },
      );
      act(() => result.current.start(createDraft("Hund")));
      act(() => result.current.edit(typeWord("Hündin")));
      act(() => result.current.start(createDraft("Katze")));
      await vi.waitFor(() => expect(held).toHaveLength(1));
      await letSavesThrough();
      await vi.waitFor(() =>
        expect(notifications()).toEqual([
          "Couldn't save the flashcard for “Hündin”.",
        ]),
      );
    });
  });

  it("saves a changed card as it is when the screen closes", async () => {
    const { result, held, unmount } = renderFlashcards();
    act(() => result.current.start(createDraft("Hund")));
    act(() =>
      result.current.edit({
        type: "textChanged",
        key: "word",
        value: "Hündin",
      }),
    );
    unmount();
    await vi.waitFor(() => expect(held).toHaveLength(1));
  });

  it("drops an untouched new card when the screen closes", async () => {
    const { result, held, unmount } = renderFlashcards();
    act(() => result.current.start(createDraft("Hund")));
    unmount();
    await flushPendingWork();
    expect(held).toHaveLength(0);
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
