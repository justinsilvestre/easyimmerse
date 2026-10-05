import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { createCardSession, reduceEditedFlashcard } from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";
import { createSaveQueue } from "./saveQueue.ts";

const flashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
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
});
