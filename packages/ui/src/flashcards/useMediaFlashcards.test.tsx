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
  });
  const held: (() => void)[] = [];
  const holdingClient = {
    send: <T,>(request: BackendRequest) =>
      request.method === "POST"
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
  /** Lets every save sent so far reach the backend. */
  const letSavesThrough = () =>
    act(async () => {
      for (const resolve of held.splice(0)) resolve();
    });
  const notifications = () =>
    effects.calls.flatMap((call) =>
      call.type === "showNotification" ? [call.message] : [],
    );
  return { ...rendered, held, posts, letSavesThrough, notifications };
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
