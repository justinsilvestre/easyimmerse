import { selectNotices } from "@easyimmerse/state";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AppStoreProviders } from "../../testSupport/AppStoreProviders.tsx";
import { createTestAppStore } from "../../testSupport/createTestAppStore.ts";
import { createSharedSaving } from "../sharedSaving.ts";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import { useGiveUpOpenings } from "./useGiveUpOpenings.ts";

afterEach(cleanup);

/** Renders the hook for project p1 over a card of p1 waiting to open, “Hund”, and one of p2, “Katze”. */
function renderGiveUp(hasFailed: boolean) {
  const { store, playerRegistry } = createTestAppStore();
  const sharedSaving = createSharedSaving();
  const unsavedCards = sharedSaving.unsavedCards;
  unsavedCards.put(exampleUnsavedCard("Hund"));
  unsavedCards.put(
    exampleUnsavedCard("Katze", { projectId: "p2", mediaFileId: "m3" }),
  );
  unsavedCards.requestOpen("Hund");
  unsavedCards.requestOpen("Katze");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProviders
      store={store}
      playerRegistry={playerRegistry}
      sharedSaving={sharedSaving}
    >
      {children}
    </AppStoreProviders>
  );
  const rendered = renderHook(
    ({ failed }) => useGiveUpOpenings("projectId", "p1", failed),
    { wrapper, initialProps: { failed: hasFailed } },
  );
  const isOpening = (word: string) =>
    unsavedCards.find(word)?.isOpening ?? false;
  const messages = () =>
    selectNotices(store.getState()).map((notice) => notice.message);
  return { ...rendered, unsavedCards, isOpening, messages };
}

describe("useGiveUpOpenings", () => {
  describe("while the screen loads", () => {
    it("keeps the card waiting to open", () => {
      const { isOpening } = renderGiveUp(false);
      expect(isOpening("Hund")).toBe(true);
    });

    it("says nothing", () => {
      const { messages } = renderGiveUp(false);
      expect(messages()).toEqual([]);
    });
  });

  describe("once loading has failed", () => {
    it("tells that the card could not be opened", () => {
      const { messages } = renderGiveUp(true);
      expect(messages()).toEqual([
        "Couldn't open the flashcard for “Hund”. It is still listed among the flashcards not saved.",
      ]);
    });

    it("clears the card's opening mark", () => {
      const { isOpening } = renderGiveUp(true);
      expect(isOpening("Hund")).toBe(false);
    });

    it("keeps the card listed", () => {
      const { unsavedCards } = renderGiveUp(true);
      expect(unsavedCards.find("Hund")).toBeDefined();
    });

    it("leaves alone a card waiting for another project", () => {
      const { isOpening } = renderGiveUp(true);
      expect(isOpening("Katze")).toBe(true);
    });

    it("gives up a card asked to open later as well", () => {
      const { unsavedCards, isOpening } = renderGiveUp(true);
      act(() => {
        unsavedCards.requestOpen("Hund");
      });
      expect(isOpening("Hund")).toBe(false);
    });

    it("tells so when loading fails after the screen appeared", () => {
      const { rerender, messages } = renderGiveUp(false);
      rerender({ failed: true });
      expect(messages()).toHaveLength(1);
    });
  });

  describe("when the screen goes before it takes the card", () => {
    it("clears the card's opening mark", () => {
      const { unmount, isOpening } = renderGiveUp(false);
      unmount();
      expect(isOpening("Hund")).toBe(false);
    });

    it("says nothing", () => {
      const { unmount, messages } = renderGiveUp(false);
      unmount();
      expect(messages()).toEqual([]);
    });

    it("keeps the card listed", () => {
      const { unmount, unsavedCards } = renderGiveUp(false);
      unmount();
      expect(unsavedCards.find("Hund")).toBeDefined();
    });
  });
});
