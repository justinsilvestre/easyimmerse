import type { AudioClip } from "@easyimmerse/types";
import { describe, expect, it } from "vitest";
import type { AppAction } from "../../app/appAction.ts";
import { actions } from "../../app/appAction.ts";
import { stateAfter } from "../../app/stateAfter.ts";
import { openWithClip } from "../../flashcards/exampleFlashcards.ts";
import type { MediaScreenState } from "../screenState.ts";
import { updateFlashcardForm } from "./updateFlashcardForm.ts";

const clip: AudioClip = { start_ms: 10_000, end_ms: 12_000 };
const otherClip: AudioClip = { start_ms: 30_000, end_ms: 31_000 };
const playing = actions.playerPlayingChanged(true);
const opened = openWithClip(clip);

/** Applies an action to the form of m1's media screen after the given earlier actions. */
const apply = (action: AppAction, ...before: AppAction[]) => {
  const app = stateAfter(actions.openMediaFileRequested("p1", "m1"), ...before);
  return updateFlashcardForm(app.screen.main as MediaScreenState, action, app);
};

describe("updateFlashcardForm", () => {
  it("keeps the card the form opens", () => {
    const [screen] = apply(opened);
    expect(screen.flashcardForm?.card).toMatchObject({ flashcardId: "f-clip" });
  });

  it("seeks to the clip's start when a card opens", () => {
    const [, effects] = apply(opened, playing);
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("seeks to the clip's start when a card opens while the player is paused", () => {
    const [, effects] = apply(opened);
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 10 }]);
  });

  it("shows the clip's start as the current time when a card opens", () => {
    const [screen] = apply(opened);
    expect(screen.player.currentTimeSeconds).toBe(10);
  });

  it("seeks nothing for a card without a clip", () => {
    const [, effects] = apply(
      actions.flashcardOpened({
        id: "h",
        project_id: "p1",
        media_file_id: "m1",
        cue_index: null,
        word_start: null,
        content: {
          ...openWithClip(clip).flashcard.draft.content,
          audio_context: null,
        },
        included_fields: [],
        created_at_ms: 1,
        updated_at_ms: 1,
      }),
      playing,
    );
    expect(effects).toEqual([]);
  });

  it("loops the clip of a card that opens while playing", () => {
    const [screen] = apply(opened, playing);
    expect(screen.loop).toEqual(clip);
  });

  it("does not start looping when the clip of a card that does not loop is dragged", () => {
    const [screen] = apply(
      actions.flashcardEdited({ type: "clipChanged", clip: otherClip }),
      opened,
    );
    expect(screen.loop).toBeNull();
  });

  it("stops looping once the card closes", () => {
    const [screen] = apply(actions.flashcardClosed(), playing, opened);
    expect(screen.loop).toBeNull();
  });

  it("forgets the clip Play once the card closes", () => {
    const [screen] = apply(
      actions.flashcardClosed(),
      opened,
      actions.clipPlayRequested(clip),
    );
    expect(screen.clipPlayback).toBeNull();
  });

  it("seeks to another card's clip start when it opens while playing", () => {
    const [, effects] = apply(openWithClip(otherClip), playing, opened);
    expect(effects).toEqual([{ type: "seekPlayer", seconds: 30 }]);
  });

  it("loops the clip of another card that opens while playing", () => {
    const [screen] = apply(openWithClip(otherClip), playing, opened);
    expect(screen.loop).toEqual(otherClip);
  });
});
