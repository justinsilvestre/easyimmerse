import { describe, expect, it } from "vitest";
import { exampleUnsavedCard } from "./exampleUnsavedCard.ts";
import { createUnsavedCardStore } from "./unsavedCardStore.ts";

const unsavedCard = (options: Parameters<typeof exampleUnsavedCard>[1] = {}) =>
  exampleUnsavedCard("Hund", { flashcardId: "c1", ...options });

/** A store listing the given cards. */
function storeWith(...cards: ReturnType<typeof unsavedCard>[]) {
  const store = createUnsavedCardStore();
  for (const card of cards) store.put(card);
  return store;
}

const sends = () => true;
const sendsNothing = () => false;

describe("createUnsavedCardStore", () => {
  it("lists a card put in it", () => {
    const store = storeWith(unsavedCard());
    expect(store.list().map((listed) => listed.flashcardId)).toEqual(["c1"]);
  });

  it("replaces a card put again under the same flashcard id", () => {
    const store = storeWith(unsavedCard(), unsavedCard({ isRejected: true }));
    expect(store.list().map((listed) => listed.isRejected)).toEqual([true]);
  });

  describe("on retry", () => {
    it("sends the card again", () => {
      const store = storeWith(unsavedCard());
      const sent: string[] = [];
      store.retry("c1", (card) => sent.push(card.flashcardId) > 0);
      expect(sent).toEqual(["c1"]);
    });

    it("marks the card as being saved", () => {
      const store = storeWith(unsavedCard());
      store.retry("c1", sends);
      expect(store.list()[0]?.isRetrying).toBe(true);
    });

    it("leaves the card unmarked when nothing was sent", () => {
      const store = storeWith(unsavedCard());
      store.retry("c1", sendsNothing);
      expect(store.list()[0]?.isRetrying).toBe(false);
    });

    it("leaves a rejected card alone, since sending it again cannot succeed", () => {
      const store = storeWith(unsavedCard({ isRejected: true }));
      const sent: string[] = [];
      store.retry("c1", (card) => sent.push(card.flashcardId) > 0);
      expect(sent).toEqual([]);
    });

    it("sends nothing more while a retry is under way", () => {
      const store = storeWith(unsavedCard());
      const sent: string[] = [];
      const send = () => sent.push("c1") > 0;
      store.retry("c1", send);
      store.retry("c1", send);
      expect(sent).toEqual(["c1"]);
    });
  });

  it("retries every card that can be retried at once", () => {
    const store = storeWith(
      unsavedCard(),
      unsavedCard({ flashcardId: "c2" }),
      unsavedCard({ flashcardId: "c3", isRejected: true }),
    );
    const sent: string[] = [];
    store.retryAll((card) => sent.push(card.flashcardId) > 0);
    expect(sent).toEqual(["c1", "c2"]);
  });

  it("changes the content of a listed card's edits", () => {
    const store = storeWith(unsavedCard());
    store.editContent("c1", (content) => ({ ...content, word: "Hündin" }));
    expect(store.list()[0]?.card.editor.content.word).toBe("Hündin");
  });

  describe("when a card is opened", () => {
    it("keeps it listed until an editor takes it", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1");
      expect(store.list().map((listed) => listed.flashcardId)).toEqual(["c1"]);
    });

    it("marks it as opening", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1");
      expect(store.list()[0]?.isOpening).toBe(true);
    });

    it("hands it to the editor of its media file", () => {
      const listed = unsavedCard();
      const store = storeWith(listed);
      store.requestOpen("c1");
      expect(store.takeOpening("m1")).toBe(listed.card);
    });

    it("takes it off the list once the editor has it", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1");
      store.takeOpening("m1");
      expect(store.list()).toEqual([]);
    });

    it("keeps it from the editor of another media file", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1");
      expect(store.takeOpening("m2")).toBeUndefined();
    });

    it("hands it over only once", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1");
      store.takeOpening("m1");
      expect(store.takeOpening("m1")).toBeUndefined();
    });

    it("opens only the card asked for last in the same media file", () => {
      const later = unsavedCard({ flashcardId: "c2" });
      const store = storeWith(unsavedCard(), later);
      store.requestOpen("c1");
      store.requestOpen("c2");
      expect(store.list().map((listed) => listed.isOpening)).toEqual([
        false,
        true,
      ]);
    });

    it("refuses a card that has no media file", () => {
      const store = storeWith(unsavedCard({ mediaFileId: null }));
      expect(store.requestOpen("c1")).toBeUndefined();
    });

    it("opens a card while a retry of it is under way", () => {
      const store = storeWith(unsavedCard());
      store.retry("c1", sends);
      store.requestOpen("c1");
      expect(store.takeOpening("m1")).toBeDefined();
    });

    it("clears the mark when the request is given up", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1")?.giveUp();
      expect(store.list()[0]?.isOpening).toBe(false);
    });

    it("keeps the card listed when the request is given up", () => {
      const store = storeWith(unsavedCard());
      store.requestOpen("c1")?.giveUp();
      expect(store.list().map((listed) => listed.flashcardId)).toEqual(["c1"]);
    });

    it("tells that a request was given up while it held the mark", () => {
      const store = storeWith(unsavedCard());
      expect(store.requestOpen("c1")?.giveUp()).toBe(true);
    });

    it("leaves a later request's mark alone when an earlier one is given up", () => {
      const store = storeWith(unsavedCard());
      const earlier = store.requestOpen("c1");
      store.requestOpen("c1");
      earlier?.giveUp();
      expect(store.list()[0]?.isOpening).toBe(true);
    });

    it("gives up nothing once an editor has taken the card", () => {
      const store = storeWith(unsavedCard());
      const opening = store.requestOpen("c1");
      store.takeOpening("m1");
      expect(opening?.giveUp()).toBe(false);
    });
  });
});
