import { describe, expect, it } from "vitest";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import {
  createUnsavedCardStore,
  type UnsavedCard,
} from "./unsavedCardStore.ts";

const unsavedCard = (overrides: Partial<UnsavedCard> = {}) =>
  exampleUnsavedCard("Hund", { flashcardId: "c1", ...overrides });

describe("createUnsavedCardStore", () => {
  it("lists a card put in it", () => {
    const store = createUnsavedCardStore();
    store.put(unsavedCard());
    expect(store.list().map((listed) => listed.flashcardId)).toEqual(["c1"]);
  });

  it("replaces a card put again under the same flashcard id", () => {
    const store = createUnsavedCardStore();
    store.put(unsavedCard());
    store.put(unsavedCard({ isRejected: true }));
    expect(store.list().map((listed) => listed.isRejected)).toEqual([true]);
  });

  describe("on retry", () => {
    it("sends the card again", () => {
      const store = createUnsavedCardStore();
      const retries: string[] = [];
      store.put(unsavedCard({ retry: () => retries.push("c1") }));
      store.retry("c1");
      expect(retries).toEqual(["c1"]);
    });

    it("marks the card as being saved", () => {
      const store = createUnsavedCardStore();
      store.put(unsavedCard());
      store.retry("c1");
      expect(store.list()[0]?.isRetrying).toBe(true);
    });

    it("leaves a rejected card alone, since sending it again cannot succeed", () => {
      const store = createUnsavedCardStore();
      const retries: string[] = [];
      store.put(
        unsavedCard({ isRejected: true, retry: () => retries.push("c1") }),
      );
      store.retry("c1");
      expect(retries).toEqual([]);
    });
  });

  it("retries every card that can be retried at once", () => {
    const store = createUnsavedCardStore();
    const retries: string[] = [];
    store.put(unsavedCard({ retry: () => retries.push("c1") }));
    store.put(
      unsavedCard({ flashcardId: "c2", retry: () => retries.push("c2") }),
    );
    store.put(
      unsavedCard({
        flashcardId: "c3",
        isRejected: true,
        retry: () => retries.push("c3"),
      }),
    );
    store.retryAll();
    expect(retries).toEqual(["c1", "c2"]);
  });

  describe("when a card is opened", () => {
    it("takes it out of the list", () => {
      const store = createUnsavedCardStore();
      store.put(unsavedCard());
      store.requestOpen("c1");
      expect(store.list()).toEqual([]);
    });

    it("hands it to the editor of its media file", () => {
      const store = createUnsavedCardStore();
      const listed = unsavedCard();
      store.put(listed);
      store.requestOpen("c1");
      expect(store.takeOpening("m1")).toBe(listed.card);
    });

    it("keeps it from the editor of another media file", () => {
      const store = createUnsavedCardStore();
      store.put(unsavedCard());
      store.requestOpen("c1");
      expect(store.takeOpening("m2")).toBeUndefined();
    });

    it("hands it over only once", () => {
      const store = createUnsavedCardStore();
      store.put(unsavedCard());
      store.requestOpen("c1");
      store.takeOpening("m1");
      expect(store.takeOpening("m1")).toBeUndefined();
    });
  });
});
