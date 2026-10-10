import type { AudioClip } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import type { FlashcardCard } from "../../flashcards/flashcardCard.ts";
import type { FlashcardForm } from "../../flashcards/flashcardForm.ts";
import { formOf } from "../../flashcards/flashcardsOnScreen.ts";
import { stepFlashcardForm } from "../../flashcards/stepFlashcardForm.ts";
import type { PlayingState } from "./playingState.ts";
import { seekTo } from "./seekTo.ts";

/**
 * Plays the clip of the flashcard open in the form, as `stepFlashcardForm` steps the form:
 * a card opening seeks to its clip's start and loops the clip if the player was playing,
 * the loop and the clip Play follow the clip's edges as they move, and both end once the form closes.
 * `app` is the state before the action.
 */
export function followFormClip(
  playing: PlayingState,
  action: AppAction,
  app: AppState,
) {
  const { form, opened } = stepFlashcardForm(app, action);
  const before = formOf(app);
  if (opened !== null) return playOpened(playing, opened);
  if (form === null)
    return updated(before === null ? playing : withClip(playing, null, null));
  const moved = movedClipOf(before, form);
  return updated(moved ? followMovedClip(playing, moved) : playing);
}

/** Seeks to the clip of the card that opened, looping it while the player plays. */
function playOpened(playing: PlayingState, opened: FlashcardCard) {
  const clip = opened.editor.content.audio_context;
  if (clip === null) return updated(withClip(playing, null, null));
  const loop = playing.player.isPlaying ? clip : null;
  return seekTo({ ...playing, loop, clipPlayback: null }, clip.start_ms);
}

function movedClipOf(
  before: FlashcardForm | null,
  form: FlashcardForm,
): AudioClip | null {
  const clip = form.card.editor.content.audio_context;
  return before !== null && before.card.editor.content.audio_context !== clip
    ? clip
    : null;
}

function followMovedClip(playing: PlayingState, clip: AudioClip) {
  const { loop, clipPlayback } = playing;
  return withClip(playing, loop && clip, clipPlayback && clip);
}

function withClip(
  playing: PlayingState,
  loop: AudioClip | null,
  clipPlayback: AudioClip | null,
): PlayingState {
  return playing.loop === loop && playing.clipPlayback === clipPlayback
    ? playing
    : { ...playing, loop, clipPlayback };
}
