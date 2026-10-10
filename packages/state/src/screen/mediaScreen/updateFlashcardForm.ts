import type { AudioClip } from "@easyimmerse/types";
import type { AppAction } from "../../app/appAction.ts";
import type { AppState } from "../../app/appState.ts";
import { updated } from "../../app/updated.ts";
import type { FlashcardCard } from "../../flashcards/flashcardCard.ts";
import type { FlashcardForm } from "../../flashcards/flashcardForm.ts";
import { stepFlashcardForm } from "../../flashcards/stepFlashcardForm.ts";
import type { MediaScreenState } from "../screenState.ts";
import { seekTo } from "./seekTo.ts";

/**
 * Keeps the flashcard open in the form, as `stepFlashcardForm` steps it, and plays its clip:
 * a card opening seeks to its clip's start and loops the clip if the player was playing,
 * the loop and the clip Play follow the clip's edges as they move, and both end once the form closes.
 * `app` is the state before the action.
 */
export function updateFlashcardForm(
  screen: MediaScreenState,
  action: AppAction,
  app: AppState,
) {
  const { form, opened } = stepFlashcardForm(app, action);
  const before = screen.flashcardForm;
  const next = form === before ? screen : { ...screen, flashcardForm: form };
  if (opened !== null) return playOpened(next, opened);
  if (form === null)
    return updated(before === null ? next : withClip(next, null, null));
  const moved = movedClipOf(before, form);
  return updated(moved ? followMovedClip(next, moved) : next);
}

/** Seeks to the clip of the card that opened, looping it while the player plays. */
function playOpened(screen: MediaScreenState, opened: FlashcardCard) {
  const clip = opened.editor.content.audio_context;
  if (clip === null) return updated(withClip(screen, null, null));
  const loop = screen.player.isPlaying ? clip : null;
  return seekTo(withClip(screen, loop, null), clip.start_ms);
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

function followMovedClip(
  screen: MediaScreenState,
  clip: AudioClip,
): MediaScreenState {
  return withClip(screen, screen.loop && clip, screen.clipPlayback && clip);
}

function withClip(
  screen: MediaScreenState,
  loop: AudioClip | null,
  clipPlayback: AudioClip | null,
): MediaScreenState {
  return screen.loop === loop && screen.clipPlayback === clipPlayback
    ? screen
    : { ...screen, loop, clipPlayback };
}
