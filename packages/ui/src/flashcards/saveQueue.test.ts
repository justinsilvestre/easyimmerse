import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createCardSession, reduceEditedFlashcard } from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { draftOfEdited } from "./flashcardDrafts.ts";
import { createSaveQueue } from "./saveQueue.ts";

const flashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
  word_start: null,
  content: exampleFlashcard,
  included_fields: ["word"],
  created_at_ms: 0,
  updated_at_ms: 0,
};

function opening() {
  const opened = reduceEditedFlashcard(null, {
    type: "opened",
    flashcard,
    session: createCardSession(),
  });
  if (opened === null) throw new Error("The flashcard did not open.");
  return opened;
}

/** A save that settles when the test says so. */
function heldSave(sent: string[], name: string) {
  let finish: () => void = () => undefined;
  const settled = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return {
    send: () => {
      sent.push(name);
      return settled;
    },
    finish: () => finish(),
  };
}

/** Lets every pending promise callback run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createSaveQueue", () => {
  it("sends one opening's save once while it is under way", async () => {
    const queue = createSaveQueue();
    const card = opening();
    const sent: string[] = [];
    queue.add(card, heldSave(sent, "first").send);
    queue.add(card, heldSave(sent, "again").send);
    await settle();
    expect(sent).toEqual(["first"]);
  });

  it("holds a later opening's save of the same flashcard until the earlier settles", async () => {
    const queue = createSaveQueue();
    const sent: string[] = [];
    const first = heldSave(sent, "first");
    queue.add(opening(), first.send);
    queue.add(opening(), heldSave(sent, "second").send);
    await settle();
    const sentBefore = [...sent];
    first.finish();
    await settle();
    expect([sentBefore, sent]).toEqual([["first"], ["first", "second"]]);
  });

  it("holds other work on a flashcard until an earlier save of it settles", async () => {
    const queue = createSaveQueue();
    const sent: string[] = [];
    const first = heldSave(sent, "save");
    queue.add(opening(), first.send);
    queue.addFor(flashcard.id, heldSave(sent, "undo").send);
    await settle();
    const sentBefore = [...sent];
    first.finish();
    await settle();
    expect([sentBefore, sent]).toEqual([["save"], ["save", "undo"]]);
  });

  it("keeps the draft last sent for a flashcard while work on it is under way", async () => {
    const queue = createSaveQueue();
    const card = opening();
    queue.add(card, heldSave([], "save").send);
    expect(queue.latestOf(flashcard)).toEqual({
      ...flashcard,
      ...draftOfEdited(card),
    });
  });

  it("keeps the draft other work sent for a flashcard while it is under way", async () => {
    const queue = createSaveQueue();
    const draft = { ...draftOfEdited(opening()), cue_index: 9 };
    queue.addFor(flashcard.id, heldSave([], "retime").send, draft);
    expect(queue.latestOf(flashcard)).toEqual({ ...flashcard, ...draft });
  });

  it("forgets the draft once work on the flashcard has settled", async () => {
    const queue = createSaveQueue();
    const save = heldSave([], "save");
    queue.add(opening(), save.send);
    save.finish();
    await settle();
    expect(queue.latestOf(flashcard)).toBe(flashcard);
  });

  describe("once a save has settled but the list has yet to catch up", () => {
    const returned: Flashcard = {
      ...flashcard,
      content: { ...flashcard.content, word: "Hündin" },
      updated_at_ms: 5,
    };

    async function settleSave() {
      const queue = createSaveQueue();
      queue.add(opening(), () => Promise.resolve(returned));
      await settle();
      return queue;
    }

    it("prefers the flashcard the save returned over an older listed one", async () => {
      const queue = await settleSave();
      expect(queue.latestOf(flashcard).content.word).toBe("Hündin");
    });

    it("prefers the listed flashcard once it is as new", async () => {
      const queue = await settleSave();
      const listed = { ...flashcard, updated_at_ms: 5 };
      expect(queue.latestOf(listed)).toBe(listed);
    });
  });

  it("tells its listeners of work on a flashcard that succeeded", async () => {
    const queue = createSaveQueue();
    const succeeded: string[] = [];
    queue.onSuccess((flashcardId) => succeeded.push(flashcardId));
    queue.addFor(flashcard.id, () => Promise.resolve(undefined));
    await settle();
    expect(succeeded).toEqual([flashcard.id]);
  });
});
