import { actions } from "@easyimmerse/state";
import type { Flashcard } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import { clipActionOf } from "./clipActionOf.ts";
import { createCardSession } from "./editedFlashcard.ts";
import { exampleFlashcard } from "./exampleFlashcard.ts";

const clip = { start_ms: 1_000, end_ms: 3_000 };

const flashcard: Flashcard = {
  id: "f1",
  project_id: "p1",
  media_file_id: "m1",
  cue_index: null,
  word_start: null,
  content: { ...exampleFlashcard, audio_context: clip },
  included_fields: ["word"],
  created_at_ms: 0,
  updated_at_ms: 0,
};

describe("clipActionOf", () => {
  it("reports the clip of a card that opens", () => {
    const session = createCardSession();
    expect(
      clipActionOf(null, session, { type: "opened", flashcard, session }),
    ).toEqual(actions.editedClipOpened(clip));
  });

  it("reports a card without a clip as opening with none", () => {
    const session = createCardSession();
    const noClip = {
      ...flashcard,
      content: { ...flashcard.content, audio_context: null },
    };
    expect(
      clipActionOf(null, session, {
        type: "opened",
        flashcard: noClip,
        session,
      }),
    ).toEqual(actions.editedClipOpened(null));
  });

  it("reports the open card's clip as it moves", () => {
    const session = createCardSession();
    expect(
      clipActionOf(session, session, {
        type: "edited",
        action: { type: "clipChanged", clip },
      }),
    ).toEqual(actions.editedClipMoved(clip));
  });

  it("reports the card closing", () => {
    expect(clipActionOf(createCardSession(), null, { type: "closed" })).toEqual(
      actions.editedClipClosed(),
    );
  });

  it("reports nothing for an edit that leaves the clip alone", () => {
    const session = createCardSession();
    expect(
      clipActionOf(session, session, {
        type: "edited",
        action: { type: "tagsChanged", tags: [] },
      }),
    ).toBeNull();
  });
});
