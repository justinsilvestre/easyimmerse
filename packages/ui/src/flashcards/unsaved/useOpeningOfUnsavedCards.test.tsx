import type { BackendRequest } from "@easyimmerse/backend";
import { selectNotices } from "@easyimmerse/state";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoreProviders } from "../../testSupport/AppStoreProviders.tsx";
import {
  createFakeBackendClient,
  fakeFailure,
} from "../../testSupport/createFakeBackendClient.ts";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import {
  fixtureMediaFiles,
  fixtureResponses,
} from "../../testSupport/fixtureResponses.ts";
import type { EditedFlashcard } from "../editedFlashcard.ts";
import { createSharedSaving } from "../sharedSaving.ts";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import { useOpeningOfUnsavedCards } from "./useOpeningOfUnsavedCards.ts";

afterEach(cleanup);

type MediaList = "found" | "missing" | "failing";

/**
 * Renders the hook for m1 over “Hund”, a card of m1 waiting to open, with a media list that answers when the test says so:
 * with m1 in it, without it, or with a failure.
 */
function renderOpening(mediaList: MediaList) {
  const backend = createFakeBackendClient({
    ...fixtureResponses,
    "GET /projects/p1/media": {
      found: fixtureMediaFiles,
      missing: { media_files: [] },
      failing: fakeFailure({ status: 500, message: "The disk is gone" }),
    }[mediaList],
  });
  let answerMediaList: () => void = () => undefined;
  const listed = new Promise<void>((resolve) => {
    answerMediaList = resolve;
  });
  const client = {
    send: async <T,>(request: BackendRequest) => {
      if (request.path === "/projects/p1/media") await listed;
      return backend.send<T>(request);
    },
  };
  const { store, playerRegistry } = createTestAppStore(client);
  const sharedSaving = createSharedSaving();
  sharedSaving.unsavedCards.put(exampleUnsavedCard("Hund"));
  sharedSaving.unsavedCards.requestOpen("Hund");
  const opened: EditedFlashcard[] = [];
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      sharedSaving={sharedSaving}
    >
      {children}
    </AppStoreProviders>
  );
  renderHook(
    () => useOpeningOfUnsavedCards("p1", "m1", (card) => opened.push(card)),
    { wrapper },
  );
  return {
    opened,
    answerMediaList: () => act(async () => answerMediaList()),
    messages: () =>
      selectNotices(store.getState()).map((notice) => notice.message),
    isListed: () => sharedSaving.unsavedCards.find("Hund") !== undefined,
  };
}

describe("useOpeningOfUnsavedCards", () => {
  it("waits for the media file to load before opening the card", () => {
    const { opened } = renderOpening("found");
    expect(opened).toEqual([]);
  });

  it("opens the card once the media file has loaded, however long that took", async () => {
    const { opened, answerMediaList } = renderOpening("found");
    await answerMediaList();
    await vi.waitFor(() => expect(opened).toHaveLength(1));
  });

  it("tells that the card could not be opened when its media file is gone", async () => {
    const { messages, answerMediaList } = renderOpening("missing");
    await answerMediaList();
    await vi.waitFor(() =>
      expect(messages()).toEqual([
        "Couldn't open the flashcard for “Hund”. It is still listed among the flashcards not saved.",
      ]),
    );
  });

  it("tells that the card could not be opened when the media files fail to load", async () => {
    const { messages, answerMediaList } = renderOpening("failing");
    await answerMediaList();
    await vi.waitFor(() => expect(messages()).toHaveLength(1));
  });

  it("keeps the card listed when it could not be opened", async () => {
    const { messages, answerMediaList, isListed } = renderOpening("missing");
    await answerMediaList();
    await vi.waitFor(() => expect(messages()).toHaveLength(1));
    expect(isListed()).toBe(true);
  });
});
